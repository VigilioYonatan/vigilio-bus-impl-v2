import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { ZodResponse } from "nestjs-zod";
import { AuthGoogleRequestDocDto } from "@/auth/application/dtos/auth-google.request.doc";
import {
  type AuthGoogleRequestDto,
  authGoogleRequestDto,
} from "@/auth/application/dtos/auth-google.request.dto";
import { AuthGoogleResponseDocDto } from "@/auth/application/dtos/auth-google.response.doc";
import type { AuthGoogleResponseDto } from "@/auth/application/dtos/auth-google.response.dto";
import { AuthLoginRequestDocDto } from "@/auth/application/dtos/auth-login.request.doc";
import {
  type AuthLoginRequestDto,
  authLoginRequestDto,
} from "@/auth/application/dtos/auth-login.request.dto";
import { AuthLoginResponseDocDto } from "@/auth/application/dtos/auth-login.response.doc";
import type { AuthLoginResponseDto } from "@/auth/application/dtos/auth-login.response.dto";
import { AuthLogoutResponseDocDto } from "@/auth/application/dtos/auth-logout.response.doc";
import type { AuthLogoutResponseDto } from "@/auth/application/dtos/auth-logout.response.dto";
import { AuthRefreshRequestDocDto } from "@/auth/application/dtos/auth-refresh.request.doc";
import {
  type AuthRefreshRequestDto,
  authRefreshRequestDto,
} from "@/auth/application/dtos/auth-refresh.request.dto";
import { AuthRefreshResponseDocDto } from "@/auth/application/dtos/auth-refresh.response.doc";
import type { AuthRefreshResponseDto } from "@/auth/application/dtos/auth-refresh.response.dto";
import { AuthRegisterRequestDocDto } from "@/auth/application/dtos/auth-register.request.doc";
import {
  type AuthRegisterRequestDto,
  authRegisterRequestDto,
} from "@/auth/application/dtos/auth-register.request.dto";
import { AuthRegisterResponseDocDto } from "@/auth/application/dtos/auth-register.response.doc";
import type { AuthRegisterResponseDto } from "@/auth/application/dtos/auth-register.response.dto";
import {
  AuthApplicationService,
  type AuthSessionServiceResult,
} from "@/auth/application/service/auth.application-service";
import { AuthRefreshCookie } from "@/auth/infrastructure/http/auth-refresh-cookie";
import {
  ApiAuthRequiredResponse,
  ApiConflictBusinessResponse,
  ApiUnauthorizedBusinessResponse,
  ApiUnexpectedErrorResponse,
  ApiValidationErrorResponse,
} from "@/shared/infrastructure/http/decorators/api-error-responses.decorator";
import { ZodPipe } from "@/shared/infrastructure/http/pipes/zod.pipe";
import { readRequestContext } from "@/shared/infrastructure/http/request-context";
import type { AuthenticatedRequest } from "@/shared/infrastructure/security/authenticated-request";
import { Protected } from "@/shared/infrastructure/security/protected.decorator";
import { Public } from "@/shared/infrastructure/security/public.decorator";

@ApiTags("auth")
@Public()
@ApiUnexpectedErrorResponse()
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthApplicationService)
    private readonly service: AuthApplicationService,
    @Inject(AuthRefreshCookie)
    private readonly refreshCookie: AuthRefreshCookie,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Registro con email y password" })
  @ApiBody({ type: AuthRegisterRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiConflictBusinessResponse("El email ya esta registrado.")
  @ZodResponse({ status: 201, type: AuthRegisterResponseDocDto })
  async register(
    @Body(new ZodPipe(authRegisterRequestDto)) body: AuthRegisterRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthRegisterResponseDto> {
    return this.issueSession(
      response,
      await this.service.register(body, readRequestContext(request)),
    );
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login normal con email y password" })
  @ApiBody({ type: AuthLoginRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiUnauthorizedBusinessResponse("Credenciales invalidas o usuario inactivo.")
  @ZodResponse({ status: 200, type: AuthLoginResponseDocDto })
  async login(
    @Body(new ZodPipe(authLoginRequestDto)) body: AuthLoginRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthLoginResponseDto> {
    return this.issueSession(response, await this.service.login(body, readRequestContext(request)));
  }

  @Post("google")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login con Google id_token" })
  @ApiBody({ type: AuthGoogleRequestDocDto })
  @ApiValidationErrorResponse()
  @ApiUnauthorizedBusinessResponse("Google id_token invalido o no verificable.")
  @ZodResponse({ status: 200, type: AuthGoogleResponseDocDto })
  async google(
    @Body(new ZodPipe(authGoogleRequestDto)) body: AuthGoogleRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthGoogleResponseDto> {
    return this.issueSession(
      response,
      await this.service.google(body, readRequestContext(request)),
    );
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renovar access token con cookie HttpOnly" })
  @ApiBody({ required: false, type: AuthRefreshRequestDocDto })
  @ApiCookieAuth("rimac_refresh")
  @ApiUnauthorizedBusinessResponse("Refresh token invalido, expirado o usuario inactivo.")
  @ZodResponse({ status: 200, type: AuthRefreshResponseDocDto })
  async refresh(
    @Body(new ZodPipe(authRefreshRequestDto)) _body: AuthRefreshRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthRefreshResponseDto> {
    const refreshToken = this.requireRefreshToken(request);

    return this.issueSession(
      response,
      await this.service.refresh(refreshToken, readRequestContext(request)),
    );
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revocar la sesion indicada por la cookie HttpOnly" })
  @ApiBody({ required: false, type: AuthRefreshRequestDocDto })
  @ApiCookieAuth("rimac_refresh")
  @ApiValidationErrorResponse()
  @ApiUnauthorizedBusinessResponse("Refresh token invalido o expirado.")
  @ZodResponse({ status: 200, type: AuthLogoutResponseDocDto })
  async logout(
    @Body(new ZodPipe(authRefreshRequestDto)) _body: AuthRefreshRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthLogoutResponseDto> {
    const refreshToken = this.refreshCookie.read(request);
    this.refreshCookie.clear(response);

    return refreshToken
      ? this.service.logout(refreshToken)
      : { success: true, revoked_sessions: 0 };
  }

  @Post("logout-all")
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revocar todas las sesiones activas del usuario" })
  @ApiAuthRequiredResponse()
  @ZodResponse({ status: 200, type: AuthLogoutResponseDocDto })
  logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthLogoutResponseDto> {
    if (!request.user) {
      throw new UnauthorizedException("Bearer token requerido");
    }

    this.refreshCookie.clear(response);
    return this.service.logoutAll(request.user.id);
  }

  private issueSession(
    response: Response,
    session: AuthSessionServiceResult,
  ): AuthLoginResponseDto {
    const { refresh_token, refresh_expires_at, ...publicSession } = session;
    this.refreshCookie.write(response, refresh_token, refresh_expires_at);
    return publicSession;
  }

  private requireRefreshToken(request: Request): string {
    const refreshToken = this.refreshCookie.read(request);

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh cookie requerida");
    }

    return refreshToken;
  }
}
