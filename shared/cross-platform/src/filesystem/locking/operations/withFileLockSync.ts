import { randomUUID } from "node:crypto";

import { portableDirname } from "../../../paths/index.js";
import { requireNonNegative } from "../helpers/requireNonNegative.js";
import { waitForLock } from "../helpers/waitForLock.js";
import { ensureDirectorySync } from "../../mutation/ensureDirectorySync.js";
import type { FileLockOptions, FileLockResult } from "../../types/types.js";
import {
  DEFAULT_LOCK_TIMEOUT_MS,
  DEFAULT_STALE_LOCK_MS,
  LOCK_POLL_MS,
} from "../helpers/constants.js";
import { isStaleLock } from "../helpers/isStaleLock.js";
import { quarantineLock } from "../helpers/quarantineLock.js";
import { releaseOwnedLock } from "../helpers/releaseOwnedLock.js";
import { tryAcquireLock } from "../helpers/tryAcquireLock.js";

export function withFileLockSync<T>(
  targetPath: string,
  operation: () => T,
  options: FileLockOptions = {},
): FileLockResult<T> {
  const timeoutMs = requireNonNegative(
    options.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS,
    "timeoutMs",
  );
  const staleMs = requireNonNegative(
    options.staleMs ?? DEFAULT_STALE_LOCK_MS,
    "staleMs",
  );
  const lockPath = `${targetPath}.lock`;
  const token = randomUUID();
  const startedAt = Date.now();

  ensureDirectorySync(portableDirname(lockPath));

  while (!tryAcquireLock(lockPath, token)) {
    if (isStaleLock(lockPath, staleMs)) {
      quarantineLock(lockPath, "stale");
      continue;
    }
    if (Date.now() - startedAt >= timeoutMs) return { acquired: false };
    waitForLock(Math.min(LOCK_POLL_MS, timeoutMs - (Date.now() - startedAt)));
  }

  try {
    return { acquired: true, value: operation() };
  } finally {
    releaseOwnedLock(lockPath, token);
  }
}
