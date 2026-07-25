import { readFileSync } from "node:fs";

import { hasCode } from "../helpers/hasCode.js";

export function readUtf8FileIfExistsSync(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    throw error;
  }
}
