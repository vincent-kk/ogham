/**
 * @file changelogState.ts
 * @description `.maencof-meta/changelog-state.json` 읽기/쓰기 — 감시 경로
 * 미기록 변경(pending)과 마지막 큐레이션 시각(lastCuratedAt)을 보관한다.
 *
 * Zod-free 수동 정규화 — SessionStart/SessionEnd 훅 번들에서 직접 import 된다.
 * `/maencof:changelog` 스킬이 같은 파일을 읽고 쓴다(기록 후 pending 비움 +
 * lastCuratedAt 갱신) — 필드 계약 변경 시 SKILL.md 동기화 필수.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { CHANGELOG_STATE_FILE } from '../../constants/changelog.js';
import { MAENCOF_META_DIR } from '../../constants/directories.js';
import type {
  ChangelogPendingScan,
  ChangelogState,
} from '../../types/changelog.js';

export function changelogStatePath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, CHANGELOG_STATE_FILE);
}

export function readChangelogState(cwd: string): ChangelogState {
  const filePath = changelogStatePath(cwd);
  if (!existsSync(filePath)) return { pending: null, lastCuratedAt: null };
  try {
    return normalizeChangelogState(JSON.parse(readFileSync(filePath, 'utf-8')));
  } catch {
    return { pending: null, lastCuratedAt: null };
  }
}

export function writeChangelogState(cwd: string, state: ChangelogState): void {
  const filePath = changelogStatePath(cwd);
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(state), 'utf-8');
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
