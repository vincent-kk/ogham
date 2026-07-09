/**
 * @file getSessionCaptureCount.ts
 * @description Return the session capture count from the pending notification.
 */
import { readPendingNotification } from './readPendingNotification.js';

/**
 * Returns session capture count from pending notification.
 * Used by hook to inject captured count in hookMessage.
 */
export function getSessionCaptureCount(cwd: string): number {
  const pending = readPendingNotification(cwd);
  return pending?.captures.length ?? 0;
}
