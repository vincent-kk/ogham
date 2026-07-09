/**
 * @file appendTransition.ts
 * @description 이력에 전이 항목을 추가하고 FIFO 로 최대 건수 상한을 유지한다.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { TRANSITION_HISTORY_MAX_ENTRIES as MAX_ENTRIES } from '../../../constants/transitionHistory.js';
import type { TransitionHistoryEntry } from '../../../types/agent.js';

import { historyPath } from './historyPath.js';
import { readTransitionHistory } from './readTransitionHistory.js';

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function appendTransition(
  cwd: string,
  entry: TransitionHistoryEntry,
): void {
  const entries = readTransitionHistory(cwd);
  entries.push(entry);

  // FIFO eviction
  while (entries.length > MAX_ENTRIES) entries.shift();

  const fp = historyPath(cwd);
  ensureDir(fp);
  writeFileSync(fp, JSON.stringify(entries), 'utf-8');
}
