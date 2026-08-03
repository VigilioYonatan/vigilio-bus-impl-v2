import { customType } from "drizzle-orm/pg-core";

export const numericStringCustom = (name?: string, precision?: number, scale?: number) => {
  const pgPrecision = precision ?? 12;
  const pgScale = scale ?? 2;

  return customType<{
    data: string;
    driverData: string;
  }>({
    dataType() {
      return `numeric(${pgPrecision},${pgScale})`;
    },
    fromDriver(value: string): string {
      return value;
    },
    toDriver(value: string): string {
      return value;
    },
  })(name ?? "numeric_string");
};

export const numericNumberCustom = (name?: string, precision?: number, scale?: number) => {
  const pgPrecision = precision ?? 12;
  const pgScale = scale ?? 2;

  return customType<{
    data: number;
    driverData: string;
  }>({
    dataType() {
      return `numeric(${pgPrecision},${pgScale})`;
    },
    fromDriver(value: string): number {
      return Number(value);
    },
    toDriver(value: number): string {
      return value.toString();
    },
  })(name ?? "numeric_number");
};
