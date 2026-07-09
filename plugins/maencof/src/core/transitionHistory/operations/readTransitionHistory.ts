/**
 * @file readTransitionHistory.ts
 * @description transition-history.json 을 읽어 이력 배열을 반환한다 (결측/손상 시 빈 배열).
 */
import { existsSync, readFileSync } from 'node:fs';

import type { TransitionHistoryEntry } from '../../../types/agent.js';

import { historyPath } from './historyPath.js';

export function readTransitionHistory(cwd: string): TransitionHistoryEntry[] {
  const fp = historyPath(cwd);
  if (!existsSync(fp)) return [];
  try {
    return JSON.parse(readFileSync(fp, 'utf-8')) as TransitionHistoryEntry[];
  } catch {
    return [];
  }
}
