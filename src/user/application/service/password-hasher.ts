import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Injectable } from "@nestjs/common";

const scryptAsync = promisify(scrypt);

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("base64url");
    const key = (await scryptAsync(password, salt, 64)) as Buffer;

    return `scrypt:v1:${salt}:${key.toString("base64url")}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const [, version, salt, encodedKey] = hash.split(":");

    if (version !== "v1" || !salt || !encodedKey) {
      return false;
    }

    const expected = Buffer.from(encodedKey, "base64url");
    const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;

    if (actual.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(actual, expected);
  }
}
