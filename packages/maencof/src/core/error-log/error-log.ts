import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { MAENCOF_META_DIR } from '../../constants/directories.js';

const LOG_FILE = 'error-log.json';
const MAX_ENTRIES = 200;

export interface ErrorLogEntry {
  hook: string;
  error: string;
  timestamp: string;
}

function logPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, LOG_FILE);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readErrorLog(cwd: string): ErrorLogEntry[] {
  const fp = logPath(cwd);
  if (!existsSync(fp)) return [];
  try {
    return JSON.parse(readFileSync(fp, 'utf-8')) as ErrorLogEntry[];
  } catch {
    return [];
  }
}

export function appendErrorLog(
  cwd: string,
  entry: ErrorLogEntry,
): void {
  const entries = readErrorLog(cwd);
  entries.push(entry);

  while (entries.length > MAX_ENTRIES) {
    entries.shift();
  }

  const fp = logPath(cwd);
  ensureDir(fp);
  writeFileSync(fp, JSON.stringify(entries, null, 2), 'utf-8');
}

/**
 * Fire-and-forget error log wrapper.
 * Never throws — safe to call in catch blocks without breaking the caller.
 */
export function appendErrorLogSafe(
  cwd: string,
  entry: ErrorLogEntry,
): void {
  try {
    appendErrorLog(cwd, entry);
  } catch {
    // Fire-and-forget: never let error logging break the caller
  }
}
