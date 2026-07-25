import { randomUUID } from "node:crypto";
import { renameSync, rmSync } from "node:fs";

import { hasCode } from "../../helpers/hasCode.js";

export function quarantineLock(lockPath: string, reason: string): void {
  const quarantinePath = `${lockPath}.${reason}-${randomUUID()}`;
  try {
    renameSync(lockPath, quarantinePath);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return;
    throw error;
  }
  rmSync(quarantinePath, { recursive: true, force: true });
}
