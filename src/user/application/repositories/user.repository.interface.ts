import type { UserIndexQueryDto } from "../dtos/user-index.request.dto";
import type { UserIndexResponseDto } from "../dtos/user-index.response.dto";
import type { UserShowResponseDto } from "../dtos/user-show.response.dto";
import type {
  UserRepositoryStoreSchema,
  UserRepositoryUpdateSchema,
  UserSchema,
} from "../schemas/user.schema";

export type UserPublicDto = UserShowResponseDto["user"];

export type UserRepositoryStoreDto = UserRepositoryStoreSchema;

export type UserRepositoryUpdateDto = UserRepositoryUpdateSchema;

export interface IUserRepository {
  index(query: UserIndexQueryDto): Promise<UserIndexResponseDto>;
  findById(id: number): Promise<UserPublicDto | null>;
  findByEmail(email: string): Promise<UserSchema | null>;
  findByGoogleSub(google_sub: string): Promise<UserSchema | null>;
  store(body: UserRepositoryStoreDto): Promise<UserPublicDto>;
  update(id: number, body: UserRepositoryUpdateDto): Promise<UserPublicDto | null>;
  destroy(id: number): Promise<boolean>;
}
