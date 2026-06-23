import { randomBytes } from "node:crypto";

/** Issue a per-server-session hex bearer token for the local HTTP server. */
export function generateToken(): string {
  return randomBytes(16).toString("hex");
}
