import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison of the expected token against a provided one. */
export function verifyToken(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
