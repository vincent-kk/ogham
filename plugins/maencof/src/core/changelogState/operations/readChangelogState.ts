/**
 * @file readChangelogState.ts
 * @description changelog-state.json 읽기 — Zod-free 수동 정규화, 손상 시 빈 상태로 폴백.
 */
import { existsSync, readFileSync } from 'node:fs';

import type {
  ChangelogPendingScan,
  ChangelogState,
} from '../../../types/changelog.js';

import { changelogStatePath } from './changelogStatePath.js';

export function readChangelogState(cwd: string): ChangelogState {
  const filePath = changelogStatePath(cwd);
  if (!existsSync(filePath)) return { pending: null, lastCuratedAt: null };
  try {
    return normalizeChangelogState(JSON.parse(readFileSync(filePath, 'utf-8')));
  } catch {
    return { pending: null, lastCuratedAt: null };
  }
}

function normalizeChangelogState(raw: unknown): ChangelogState {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    return { pending: null, lastCuratedAt: null };
  const obj = raw as Record<string, unknown>;
  return {
    pending: normalizePending(obj.pending),
    lastCuratedAt:
      typeof obj.lastCuratedAt === 'string' ? obj.lastCuratedAt : null,
  };
}

function normalizePending(raw: unknown): ChangelogPendingScan | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.detectedAt !== 'string' || !Array.isArray(obj.changes))
    return null;
  const pending: ChangelogPendingScan = {
    detectedAt: obj.detectedAt,
    changes: obj.changes.filter((c): c is string => typeof c === 'string'),
  };
  if (typeof obj.sessionId === 'string') pending.sessionId = obj.sessionId;
  return pending;
}
