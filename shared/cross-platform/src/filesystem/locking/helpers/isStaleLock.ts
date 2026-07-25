import { statSync } from "node:fs";

import { hasCode } from "../../helpers/hasCode.js";

export function isStaleLock(lockPath: string, staleMs: number): boolean {
  try {
    return Date.now() - statSync(lockPath).mtimeMs > staleMs;
  } catch (error) {
    if (hasCode(error, "ENOENT")) return false;
    throw error;
  }
}
