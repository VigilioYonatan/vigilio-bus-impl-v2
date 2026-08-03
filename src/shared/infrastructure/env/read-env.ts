export function readEnv(name: string): string | undefined {
  const value = Reflect.get(process.env, name);
  return typeof value === "string" ? value : undefined;
}
