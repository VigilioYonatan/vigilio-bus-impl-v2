import type { Request } from "express";

export type AuthenticatedUser = {
  id: number;
  email: string;
  role: "admin" | "operador" | "auditor" | "soporte";
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
