import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { UserDestroyResponseDto } from "../dtos/user-destroy.response.dto";
import type { UserIndexQueryDto } from "../dtos/user-index.request.dto";
import type { UserIndexResponseDto } from "../dtos/user-index.response.dto";
import type { UserShowResponseDto } from "../dtos/user-show.response.dto";
import type { UserStoreRequestDto } from "../dtos/user-store.request.dto";
import type { UserStoreResponseDto } from "../dtos/user-store.response.dto";
import type { UserUpdateRequestDto } from "../dtos/user-update.request.dto";
import type { UserUpdateResponseDto } from "../dtos/user-update.response.dto";
import type {
  IUserRepository,
  UserRepositoryUpdateDto,
} from "../repositories/user.repository.interface";
import { USER_REPOSITORY } from "../repositories/user.repository.token";
import { PasswordHasher } from "./password-hasher";

@Injectable()
export class UserApplicationService {
  private readonly logger = new Logger(UserApplicationService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: IUserRepository,
    @Inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async index(query: UserIndexQueryDto): Promise<UserIndexResponseDto> {
    this.logger.log({ action: "user.index", query }, "Indexing users");
    return this.repository.index(query);
  }

  async show(id: number): Promise<UserShowResponseDto> {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return {
      success: true,
      user,
    };
  }

  async store(body: UserStoreRequestDto): Promise<UserStoreResponseDto> {
    await this.ensureEmailIsAvailable(body.email);

    const user = await this.repository.store({
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      status: body.status,
      provider: "local",
      google_sub: null,
      password_hash: await this.passwordHasher.hash(body.password),
    });

    this.logger.log({ action: "user.store", user_id: user.id }, "Stored user");

    return {
      success: true,
      user,
    };
  }

  async update(id: number, body: UserUpdateRequestDto): Promise<UserUpdateResponseDto> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundException("Usuario no encontrado");
    }

    if (body.email && body.email !== existing.email) {
      await this.ensureEmailIsAvailable(body.email);
    }

    const updateBody: UserRepositoryUpdateDto = {};

    if (body.email) {
      updateBody.email = body.email;
    }

    if (body.full_name) {
      updateBody.full_name = body.full_name;
    }

    if (body.role) {
      updateBody.role = body.role;
    }

    if (body.status) {
      updateBody.status = body.status;
    }

    if (body.password) {
      updateBody.password_hash = await this.passwordHasher.hash(body.password);
      updateBody.provider = "local";
    }

    const user = await this.repository.update(id, updateBody);

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    this.logger.log({ action: "user.update", user_id: id }, "Updated user");

    return {
      success: true,
      user,
    };
  }

  async destroy(id: number): Promise<UserDestroyResponseDto> {
    const deleted = await this.repository.destroy(id);

    if (!deleted) {
      throw new NotFoundException("Usuario no encontrado");
    }

    this.logger.log({ action: "user.destroy", user_id: id }, "Destroyed user");

    return {
      success: true,
      message: "Usuario eliminado correctamente",
    };
  }

  private async ensureEmailIsAvailable(email: string): Promise<void> {
    const existing = await this.repository.findByEmail(email);

    if (existing) {
      throw new ConflictException("El email ya esta registrado");
    }
  }
}
