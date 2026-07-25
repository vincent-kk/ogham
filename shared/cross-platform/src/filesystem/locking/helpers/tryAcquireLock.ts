import { mkdirSync, rmSync, writeFileSync } from "node:fs";

import { portableJoin } from "../../../paths/index.js";
import { hasCode } from "../../helpers/hasCode.js";
import { LOCK_OWNER_FILE } from "./constants.js";

export function tryAcquireLock(lockPath: string, token: string): boolean {
  try {
    mkdirSync(lockPath, { mode: 0o700 });
  } catch (error) {
    if (hasCode(error, "EEXIST")) return false;
    throw error;
  }

  try {
    writeFileSync(portableJoin(lockPath, LOCK_OWNER_FILE), token, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    return true;
  } catch (error) {
    rmSync(lockPath, { recursive: true, force: true });
    throw error;
  }
}
