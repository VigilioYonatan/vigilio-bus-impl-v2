import { z } from "zod";
import { timestampSchema } from "@/shared/application/schemas/timestamp.schema";

export const userSchema = z.object({
  id: z.number().int().positive(),
  email: z.email().trim().toLowerCase().max(160),
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(["admin", "operador", "auditor", "soporte"]),
  status: z.enum(["active", "inactive", "blocked"]),
  provider: z.enum(["local", "google"]),
  google_sub: z.string().trim().min(1).max(160).nullable(),
  password_hash: z.string().min(1).nullable(),
  ...timestampSchema.shape,
});

export type UserSchema = z.infer<typeof userSchema>;
export type UserRole = UserSchema["role"];

export const userPublicSchema = userSchema.omit({
  password_hash: true,
});

export const userIndexFilterSchema = userSchema.pick({
  role: true,
  status: true,
  provider: true,
});

export const userStoreSchema = userSchema
  .pick({
    email: true,
    full_name: true,
    role: true,
    status: true,
  })
  .extend({
    password: z.string().min(12).max(128),
    role: userSchema.shape.role.default("operador"),
    status: userSchema.shape.status.default("active"),
  });

export const userUpdateSchema = userStoreSchema.partial();

export const userRegisterSchema = userSchema
  .pick({
    email: true,
    full_name: true,
  })
  .extend({
    password: z.string().min(12).max(128),
  });

export const userTokenSubjectSchema = userSchema.pick({
  id: true,
  email: true,
  role: true,
});

export type UserPublicSchema = z.infer<typeof userPublicSchema>;
export type UserIndexFilterSchema = z.infer<typeof userIndexFilterSchema>;
export type UserStoreSchema = z.infer<typeof userStoreSchema>;
export type UserUpdateSchema = z.infer<typeof userUpdateSchema>;
export type UserRegisterSchema = z.infer<typeof userRegisterSchema>;
export type UserTokenSubjectSchema = z.infer<typeof userTokenSubjectSchema>;
export type UserRepositoryStoreSchema = Pick<
  UserSchema,
  "email" | "full_name" | "role" | "status" | "provider" | "password_hash"
> & {
  google_sub?: string | null;
};
export type UserRepositoryUpdateSchema = Partial<
  Pick<
    UserSchema,
    "email" | "full_name" | "role" | "status" | "provider" | "password_hash" | "google_sub"
  >
>;
