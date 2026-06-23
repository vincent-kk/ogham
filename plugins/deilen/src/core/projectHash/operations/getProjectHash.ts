import { createHash } from "node:crypto";

/** Scope key for a working directory: first 12 hex of its sha256. */
export function getProjectHash(cwd: string): string {
  return createHash("sha256").update(cwd).digest("hex").slice(0, 12);
}
