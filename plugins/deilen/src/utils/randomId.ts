import { randomBytes } from "node:crypto";

export function randomId(prefix = ""): string {
  return `${prefix}${randomBytes(6).toString("hex")}`;
}
