import { statSync } from "node:fs";

import { hasCode } from "../../helpers/hasCode.js";

export function readModeIfExists(path: string): number | undefined {
  try {
    return statSync(path).mode & 0o777;
  } catch (error) {
    if (hasCode(error, "ENOENT")) return undefined;
    throw error;
  }
}
