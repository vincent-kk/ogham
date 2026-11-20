import { hasCode } from "../../helpers/hasCode.js";

/**
 * Recognize Windows errors that can result from another process touching a lock.
 * @param error Failure from a lock filesystem operation.
 * @returns Whether the lock operation may be retried within its existing limit.
 */
export function isWindowsLockContention(error: unknown): boolean {
  return (
    process.platform === "win32" &&
    (hasCode(error, "EPERM") ||
      hasCode(error, "EACCES") ||
      hasCode(error, "EBUSY"))
  );
}
