import { readFileSync } from "node:fs";

import { hasCode } from "../helpers/hasCode.js";

export function readFileIfExistsSync(path: string): Uint8Array | null {
  try {
    return Uint8Array.from(readFileSync(path));
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    throw error;
  }
}
