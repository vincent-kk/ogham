import { readFileSync } from "node:fs";

import { portableJoin } from "../../../paths/index.js";
import { LOCK_OWNER_FILE, LOCK_POLL_MS } from "./constants.js";
import { isWindowsLockContention } from "./isWindowsLockContention.js";
import { quarantineLock } from "./quarantineLock.js";
import { waitForLock } from "./waitForLock.js";

/** The first release attempt plus two retries for brief Windows contention. */
const RELEASE_ATTEMPTS = 3;

/**
 * Release a lock after rechecking ownership on every attempt.
 * @param lockPath Directory containing the owner token.
 * @param token Token of the completed operation.
 * @returns Nothing. Failed cleanup leaves recovery to stale-lock handling.
 */
export function releaseOwnedLock(lockPath: string, token: string): void {
  const ownerPath = portableJoin(lockPath, LOCK_OWNER_FILE);
  for (let attempt = 1; attempt <= RELEASE_ATTEMPTS; attempt += 1)
    try {
      const owner = readFileSync(ownerPath, "utf8");
      if (owner === token) quarantineLock(lockPath, "release");
      return;
    } catch (error) {
      if (attempt === RELEASE_ATTEMPTS || !isWindowsLockContention(error))
        return;
      waitForLock(LOCK_POLL_MS);
    }
}
