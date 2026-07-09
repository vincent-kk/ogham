/**
 * @file readErrorLog.ts
 * @description error-log.json 을 읽어 항목 배열을 반환한다 (결측/손상 시 빈 배열).
 */
import { existsSync, readFileSync } from 'node:fs';

import type { ErrorLogEntry } from '../types/types.js';

import { logPath } from './logPath.js';

export function readErrorLog(cwd: string): ErrorLogEntry[] {
  const fp = logPath(cwd);
  if (!existsSync(fp)) return [];
  try {
    return JSON.parse(readFileSync(fp, 'utf-8')) as ErrorLogEntry[];
  } catch {
    return [];
  }
}
