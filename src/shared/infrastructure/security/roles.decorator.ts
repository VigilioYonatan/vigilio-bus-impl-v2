import { SetMetadata } from "@nestjs/common";
import type { AuthenticatedUser } from "./authenticated-request";

export const ROLES_KEY = "roles";
export type ApplicationRole = AuthenticatedUser["role"];

export const Roles = (...roles: ApplicationRole[]) => SetMetadata(ROLES_KEY, roles);
