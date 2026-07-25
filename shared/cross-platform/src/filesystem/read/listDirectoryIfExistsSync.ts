import { readdirSync } from "node:fs";

import { hasCode } from "../helpers/hasCode.js";

export function listDirectoryIfExistsSync(path: string): readonly string[] {
  try {
    return readdirSync(path);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return [];
    throw error;
  }
}
