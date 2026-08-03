import * as authSchema from "@/auth/infrastructure/persistence/drizzle/schema";
import * as productSchema from "@/product/infrastructure/persistence/drizzle/schema";
import * as userSchema from "@/user/infrastructure/persistence/drizzle/schema";

export const databaseSchema = {
  ...authSchema,
  ...productSchema,
  ...userSchema,
};
