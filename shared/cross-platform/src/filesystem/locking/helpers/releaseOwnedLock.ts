import { readFileSync } from "node:fs";

import { portableJoin } from "../../../paths/index.js";
import { hasCode } from "../../helpers/hasCode.js";
import { LOCK_OWNER_FILE } from "./constants.js";
import { quarantineLock } from "./quarantineLock.js";

export function releaseOwnedLock(lockPath: string, token: string): void {
  try {
    const owner = readFileSync(portableJoin(lockPath, LOCK_OWNER_FILE), "utf8");
    if (owner !== token) return;
    quarantineLock(lockPath, "release");
  } catch (error) {
    if (!hasCode(error, "ENOENT")) throw error;
  }
}
