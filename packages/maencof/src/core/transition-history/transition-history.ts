import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { TransitionHistoryEntry } from '../../types/agent.js';
import { MAENCOF_META_DIR } from '../../constants/directories.js';

const HISTORY_FILE = 'transition-history.json';
const MAX_ENTRIES = 500;

function historyPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, HISTORY_FILE);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readTransitionHistory(
  cwd: string,
): TransitionHistoryEntry[] {
  const fp = historyPath(cwd);
  if (!existsSync(fp)) return [];
  try {
    return JSON.parse(readFileSync(fp, 'utf-8')) as TransitionHistoryEntry[];
  } catch {
    return [];
  }
}

export function appendTransition(
  cwd: string,
  entry: TransitionHistoryEntry,
): void {
  const entries = readTransitionHistory(cwd);
  entries.push(entry);

  // FIFO eviction
  while (entries.length > MAX_ENTRIES) {
    entries.shift();
  }

  const fp = historyPath(cwd);
  ensureDir(fp);
  writeFileSync(fp, JSON.stringify(entries, null, 2), 'utf-8');
}

export function getRejectCount(
  cwd: string,
  path: string,
  direction: string,
): number {
  const entries = readTransitionHistory(cwd);
  return entries.filter(
    (e) =>
      e.directive.path === path &&
      e.directive.outcome === 'rejected' &&
      `${e.directive.fromLayer}->${e.directive.toLayer}` === direction,
  ).length;
}
