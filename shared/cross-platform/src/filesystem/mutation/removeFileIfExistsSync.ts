import { unlinkSync } from "node:fs";

import { hasCode } from "../helpers/hasCode.js";

export function removeFileIfExistsSync(path: string): boolean {
  try {
    unlinkSync(path);
    return true;
  } catch (error) {
    if (hasCode(error, "ENOENT")) return false;
    throw error;
  }
}
