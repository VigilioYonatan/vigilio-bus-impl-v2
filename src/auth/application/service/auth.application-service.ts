import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  IUserRepository,
  UserPublicDto,
} from "@/user/application/repositories/user.repository.interface";
import { USER_REPOSITORY } from "@/user/application/repositories/user.repository.token";
import type { UserSchema } from "@/user/application/schemas/user.schema";
import { PasswordHasher } from "@/user/application/service/password-hasher";
import type { AuthGoogleRequestDto } from "../dtos/auth-google.request.dto";
import type { AuthLoginRequestDto } from "../dtos/auth-login.request.dto";
import type { AuthLoginResponseDto } from "../dtos/auth-login.response.dto";
import type { AuthLogoutResponseDto } from "../dtos/auth-logout.response.dto";
import type { AuthRegisterRequestDto } from "../dtos/auth-register.request.dto";
import type { IAuthSessionRepository } from "../repositories/auth-session.repository.interface";
import { AUTH_SESSION_REPOSITORY } from "../repositories/auth-session.repository.token";
import { AuthTokenService } from "../security/auth-token.service";
import { GoogleIdTokenVerifier } from "../security/google-id-token.verifier";

/**
 * Contexto de la peticion. Lo inyecta el controller; el servicio no conoce HTTP.
 */
export type AuthRequestContext = {
  ip_address: string | null;
  user_agent: string | null;
};

const EMPTY_CONTEXT: AuthRequestContext = { ip_address: null, user_agent: null };

/** Ventana y umbrales de la proteccion contra fuerza bruta. */
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_EMAIL = 5;
const MAX_ATTEMPTS_PER_IP = 20;

export type AuthSessionServiceResult = AuthLoginResponseDto & {
  refresh_token: string;
  refresh_expires_at: string;
};

/**
 * Hash scrypt descartable con la misma forma que uno real. Se verifica contra el
 * cuando el email no existe para que el tiempo de respuesta no revele si la
 * cuenta esta registrada (enumeracion de usuarios por temporizacion).
 */
const DUMMY_PASSWORD_HASH =
  "scrypt:v1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

@Injectable()
export class AuthApplicationService {
  private readonly logger = new Logger(AuthApplicationService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AuthTokenService)
    private readonly authTokenService: AuthTokenService,
    @Inject(GoogleIdTokenVerifier)
    private readonly googleIdTokenVerifier: GoogleIdTokenVerifier,
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly authSessionRepository: IAuthSessionRepository,
  ) {}

  async register(
    body: AuthRegisterRequestDto,
    context: AuthRequestContext = EMPTY_CONTEXT,
  ): Promise<AuthSessionServiceResult> {
    const existing = await this.userRepository.findByEmail(body.email);

    if (existing) {
      throw new ConflictException("El email ya esta registrado");
    }

    const user = await this.userRepository.store({
      email: body.email,
      full_name: body.full_name,
      role: "operador",
      status: "active",
      provider: "local",
      google_sub: null,
      password_hash: await this.passwordHasher.hash(body.password),
    });

    this.logger.log({ action: "auth.register", user_id: user.id }, "Registered user");

    return this.buildTokenResponse(user, context);
  }

  async login(
    body: AuthLoginRequestDto,
    context: AuthRequestContext = EMPTY_CONTEXT,
  ): Promise<AuthSessionServiceResult> {
    const email = body.email.toLowerCase();

    await this.assertNotRateLimited(email, context);

    const user = await this.userRepository.findByEmail(body.email);

    // Se verifica siempre un hash, exista o no el usuario, para no filtrar
    // por tiempo de respuesta que emails estan registrados.
    const passwordMatches = await this.passwordHasher.verify(
      body.password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user?.password_hash || user.status !== "active" || !passwordMatches) {
      await this.authSessionRepository.recordLoginAttempt(email, context.ip_address);
      this.logger.warn(
        { action: "auth.login_failed", email_domain: email.split("@")[1] ?? null },
        "Failed login attempt",
      );

      throw new UnauthorizedException("Credenciales invalidas");
    }

    await this.authSessionRepository.clearLoginAttempts(email);
    this.logger.log({ action: "auth.login", user_id: user.id }, "Logged in user");

    return this.buildTokenResponse(this.toPublicUser(user), context);
  }

  async google(
    body: AuthGoogleRequestDto,
    context: AuthRequestContext = EMPTY_CONTEXT,
  ): Promise<AuthSessionServiceResult> {
    const googlePayload = await this.googleIdTokenVerifier.verify(body.id_token);
    const userByGoogleSub = await this.userRepository.findByGoogleSub(googlePayload.sub);

    if (userByGoogleSub) {
      return this.buildTokenResponse(this.toPublicUser(userByGoogleSub), context);
    }

    const userByEmail = await this.userRepository.findByEmail(googlePayload.email);

    if (userByEmail) {
      const linkedUser = await this.userRepository.update(userByEmail.id, {
        provider: "google",
        google_sub: googlePayload.sub,
      });

      if (!linkedUser) {
        throw new UnauthorizedException("No se pudo vincular la cuenta Google");
      }

      return this.buildTokenResponse(linkedUser, context);
    }

    const user = await this.userRepository.store({
      email: googlePayload.email,
      full_name: googlePayload.name ?? googlePayload.email,
      role: "operador",
      status: "active",
      provider: "google",
      google_sub: googlePayload.sub,
      password_hash: null,
    });

    this.logger.log({ action: "auth.google", user_id: user.id }, "Logged in with Google");

    return this.buildTokenResponse(user, context);
  }

  /**
   * Renueva el par de tokens rotando el refresh token.
   *
   * Detecta reuso: si el jti presentado ya estaba revocado, se asume que el token
   * fue robado y se revoca la familia completa, cerrando todas las sesiones
   * derivadas de ese login. Es el comportamiento que exige OAuth 2.0 Security BCP.
   */
  async refresh(
    refreshToken: string,
    context: AuthRequestContext = EMPTY_CONTEXT,
  ): Promise<AuthSessionServiceResult> {
    const payload = await this.authTokenService.verify(refreshToken, "refresh");
    const session = await this.authSessionRepository.findByJti(payload.jti);

    if (!session) {
      // Firma valida pero sin sesion: el token fue purgado o revocado y borrado.
      throw new UnauthorizedException("Refresh token invalido");
    }

    // La revocacion es atomica: devuelve false si otro proceso ya la hizo.
    const revoked = await this.authSessionRepository.revokeByJti(payload.jti, "rotated");

    if (!revoked) {
      const affected = await this.authSessionRepository.revokeFamily(
        session.family_id,
        "reuse_detected",
      );

      this.logger.error(
        {
          action: "auth.refresh_reuse_detected",
          user_id: session.user_id,
          family_id: session.family_id,
          revoked_sessions: affected,
        },
        "Refresh token reuse detected, family revoked",
      );

      throw new UnauthorizedException("Refresh token invalido");
    }

    const user = await this.userRepository.findById(session.user_id);

    if (user?.status !== "active") {
      await this.authSessionRepository.revokeFamily(session.family_id, "user_inactive");
      throw new UnauthorizedException("Refresh token invalido");
    }

    return this.buildTokenResponse(user, context, session.family_id);
  }

  /** Cierra la sesion asociada al refresh token presentado. */
  async logout(refreshToken: string): Promise<AuthLogoutResponseDto> {
    const payload = await this.authTokenService.verify(refreshToken, "refresh");
    const revoked = await this.authSessionRepository.revokeByJti(payload.jti, "logout");

    this.logger.log(
      { action: "auth.logout", user_id: Number(payload.sub), revoked },
      "Logged out session",
    );

    return { success: true, revoked_sessions: revoked ? 1 : 0 };
  }

  /** Cierra todas las sesiones activas del usuario autenticado. */
  async logoutAll(userId: number): Promise<AuthLogoutResponseDto> {
    const revoked = await this.authSessionRepository.revokeAllForUser(userId, "logout_all");

    this.logger.log(
      { action: "auth.logout_all", user_id: userId, revoked_sessions: revoked },
      "Logged out all sessions",
    );

    return { success: true, revoked_sessions: revoked };
  }

  /**
   * Bloquea el login cuando se superan los umbrales por email o por IP.
   *
   * El estado vive en PostgreSQL y no en memoria porque en Lambda cada invocacion
   * puede caer en un contenedor distinto: un contador en proceso no frenaria nada.
   */
  private async assertNotRateLimited(email: string, context: AuthRequestContext): Promise<void> {
    const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const attempts = await this.authSessionRepository.countLoginAttempts({
      email,
      ip_address: context.ip_address,
      since,
    });

    const emailBlocked = attempts.by_email >= MAX_ATTEMPTS_PER_EMAIL;
    const ipBlocked = attempts.by_ip >= MAX_ATTEMPTS_PER_IP;

    if (!emailBlocked && !ipBlocked) {
      return;
    }

    this.logger.warn(
      {
        action: "auth.login_rate_limited",
        by_email: attempts.by_email,
        by_ip: attempts.by_ip,
      },
      "Login blocked by rate limit",
    );

    throw new HttpException(
      {
        success: false,
        message: `Demasiados intentos fallidos. Reintenta en ${LOGIN_ATTEMPT_WINDOW_MINUTES} minutos.`,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async buildTokenResponse(
    user: UserPublicDto,
    context: AuthRequestContext,
    familyId?: string,
  ): Promise<AuthSessionServiceResult> {
    const tokens = await this.authTokenService.signTokenPair(user, familyId);

    await this.authSessionRepository.store({
      user_id: user.id,
      jti: tokens.refresh_jti,
      family_id: tokens.refresh_family_id,
      token_hash: tokens.refresh_token_hash,
      expires_at: tokens.refresh_expires_at,
      user_agent: context.user_agent?.slice(0, 255) ?? null,
      ip_address: context.ip_address,
    });

    return {
      success: true,
      token_type: tokens.token_type,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      refresh_expires_at: tokens.refresh_expires_at,
      expires_in: tokens.expires_in,
      user,
    };
  }

  private toPublicUser(user: UserSchema): UserPublicDto {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      provider: user.provider,
      google_sub: user.google_sub,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
