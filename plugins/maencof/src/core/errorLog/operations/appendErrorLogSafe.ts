/**
 * @file appendErrorLogSafe.ts
 * @description appendErrorLog 의 fire-and-forget 래퍼.
 */
import type { ErrorLogEntry } from '../types/types.js';

import { appendErrorLog } from './appendErrorLog.js';

/**
 * Fire-and-forget error log wrapper.
 * Never throws — safe to call in catch blocks without breaking the caller.
 */
export function appendErrorLogSafe(cwd: string, entry: ErrorLogEntry): void {
  try {
    appendErrorLog(cwd, entry);
  } catch {
    // Fire-and-forget: never let error logging break the caller
  }
}
