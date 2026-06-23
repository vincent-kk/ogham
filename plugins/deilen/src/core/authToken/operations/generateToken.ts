import { randomBytes } from "node:crypto";

/** Issue a one-time hex token for the local HTTP server. */
export function generateToken(): string {
  return randomBytes(16).toString("hex");
}
