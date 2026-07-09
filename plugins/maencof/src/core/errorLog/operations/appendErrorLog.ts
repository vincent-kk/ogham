/**
 * @file appendErrorLog.ts
 * @description 에러 로그에 항목을 추가하고 FIFO 로 최대 건수 상한을 유지한다.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { ERROR_LOG_MAX_ENTRIES as MAX_ENTRIES } from '../../../constants/errorLog.js';
import type { ErrorLogEntry } from '../types/types.js';

import { logPath } from './logPath.js';
import { readErrorLog } from './readErrorLog.js';

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function appendErrorLog(cwd: string, entry: ErrorLogEntry): void {
  const entries = readErrorLog(cwd);
  entries.push(entry);

  while (entries.length > MAX_ENTRIES) entries.shift();

  const fp = logPath(cwd);
  ensureDir(fp);
  writeFileSync(fp, JSON.stringify(entries), 'utf-8');
}
