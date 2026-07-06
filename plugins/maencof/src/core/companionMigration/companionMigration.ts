/**
 * @file companionMigration.ts
 * @description companion-identity.json v1→v2 파일 마이그레이션 (MCP 서버 기동 1회).
 *
 * hook은 얇게 유지하고 무거운 1회성 변환은 여기서 수행한다. schema_version ≥ 2면
 * no-op(멱등). v2 identity를 먼저 쓴 뒤에만 CLAUDE.md tone 섹션을 제거해 부분 실패를
 * 차단한다. 실패는 격리(로그 후 원본 유지) — 마이그레이션 오류가 서버 기동을 막지 않는다.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type CompanionIdentityV2,
  CompanionIdentityV2Schema,
} from '../../types/companion.js';
import { getCompanionSchemaVersion } from '../../types/companionGuard.js';
import { backupPathFor } from '../backupPath/index.js';
import { assertTurnBudget } from '../companionBudget/companionBudget.js';
import { normalizeToV2 } from '../companionNormalize/normalizeToV2.js';
import { toIsoDatetime } from '../companionNormalize/toIsoDatetime.js';
import { appendErrorLogSafe } from '../errorLog/errorLog.js';

import { removeClaudeMdTone, scanClaudeMdTone } from './absorbClaudeMdTone.js';

export type CompanionMigrationReason =
  | 'no-file'
  | 'already-v2'
  | 'invalid'
  | 'migrated'
  | 'error';

export interface CompanionMigrationResult {
  migrated: boolean;
  reason: CompanionMigrationReason;
  backupPath?: string;
  /** CLAUDE.md tone 섹션 흡수(제거) 여부 */
  claudeMdAbsorbed?: boolean;
  /** 매 턴 예산 초과분(자동 강등 없음, 경고만) */
  turnBudgetOverBy?: number;
}

const IDENTITY_RELATIVE = ['.maencof-meta', 'companion-identity.json'];

/**
 * v1→v2 마이그레이션을 1회 수행한다. serverEntry가 매 기동 호출해도 안전(멱등).
 */
export function runCompanionMigration(cwd: string): CompanionMigrationResult {
  const identityPath = join(cwd, ...IDENTITY_RELATIVE);
  try {
    if (!existsSync(identityPath))
      return { migrated: false, reason: 'no-file' };

    const raw: unknown = JSON.parse(readFileSync(identityPath, 'utf-8'));
    if (getCompanionSchemaVersion(raw) >= 2)
      return { migrated: false, reason: 'already-v2' };

    const normalized = normalizeToV2(raw);
    if (!normalized) {
      appendErrorLogSafe(cwd, {
        hook: 'companion-migration',
        error:
          'companion-identity.json invalid (missing name/greeting); migration skipped',
        timestamp: new Date().toISOString(),
      });
      return { migrated: false, reason: 'invalid' };
    }

    // CLAUDE.md tone 섹션을 읽기 전용으로 스캔해 candidate에 합류(제거는 아직 안 함).
    const absorbedSections = scanClaudeMdTone(cwd, normalized.name);

    const now = new Date().toISOString();
    const candidate: CompanionIdentityV2 = {
      schema_version: 2,
      name: normalized.name,
      role: normalized.role ?? '',
      greeting: normalized.greeting,
      sections: [...normalized.sections, ...absorbedSections],
      created_at: toIsoDatetime(normalized.created_at, now),
      updated_at: now,
    };

    const parsed = CompanionIdentityV2Schema.safeParse(candidate);
    if (!parsed.success) {
      appendErrorLogSafe(cwd, {
        hook: 'companion-migration',
        error: `v2 validation failed: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
        timestamp: now,
      });
      return { migrated: false, reason: 'invalid' };
    }

    // §7-4: 매 턴 예산 초과는 경고만 — 자동 강등하지 않는다(저작 도구로 조정 권장).
    const budget = assertTurnBudget(parsed.data.sections);
    if (!budget.ok)
      appendErrorLogSafe(cwd, {
        hook: 'companion-migration',
        error: `turn identity budget exceeded by ${budget.overBy} chars after migration; adjust via companion_edit (demote to session or add brief). offenders: ${budget.offenders
          .map((o) => `${o.key}:${o.chars}`)
          .join(', ')}`,
        timestamp: now,
      });

    // identity를 먼저 쓴다 (핵심 마이그레이션).
    const backupPath = backupPathFor(identityPath);
    copyFileSync(identityPath, backupPath);
    writeFileSync(
      identityPath,
      JSON.stringify(parsed.data, null, 2) + '\n',
      'utf-8',
    );

    // identity 쓰기 성공 후에만 CLAUDE.md에서 흡수한 섹션을 제거한다.
    const removal =
      absorbedSections.length > 0
        ? removeClaudeMdTone(cwd, normalized.name)
        : { removed: false };

    return {
      migrated: true,
      reason: 'migrated',
      backupPath,
      claudeMdAbsorbed: removal.removed,
      turnBudgetOverBy: budget.ok ? undefined : budget.overBy,
    };
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'companion-migration',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
    return { migrated: false, reason: 'error' };
  }
}
