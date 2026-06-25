import { randomUUID } from "node:crypto";

/** Generate a unique identifier (async job ids, manifest ids). */
export function randomId(): string {
  return randomUUID();
}
