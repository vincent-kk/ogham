/**
 * @file companionMigration.ts
 * @description companion-identity.json 레거시→정본 파일 마이그레이션 (MCP 서버 기동 1회).
 *
 * hook은 얇게 유지하고 무거운 1회성 변환은 여기서 수행한다. schema_version ≥ 2면
 * no-op(멱등). v1→v2 필드 매핑만 수행하며 CLAUDE.md는 건드리지 않는다. 매 턴 예산을
 * 초과하면 저살리언스 turn 섹션을 session으로 자동 강등해 500 이내로 맞춘다. 실패는
 * 격리(로그 후 원본 유지) — 마이그레이션 오류가 서버 기동을 막지 않는다.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TURN_IDENTITY_CHAR_BUDGET } from '../../constants/companionIdentity.js';
import {
  type CompanionIdentity,
  CompanionIdentitySchema,
} from '../../types/companion.js';
import type { CompanionSectionMinimal } from '../../types/companionGuard.js';
import { getCompanionSchemaVersion } from '../../types/companionGuard.js';
import { backupPathFor } from '../backupPath/index.js';
import { assertTurnBudget } from '../companionBudget/index.js';
import { normalizeCompanionIdentity } from '../companionNormalize/normalizeCompanionIdentity.js';
import { toIsoDatetime } from '../companionNormalize/toIsoDatetime.js';
import { appendErrorLogSafe } from '../errorLog/index.js';

export type CompanionMigrationReason =
  | 'no-file'
  | 'already-current'
  | 'invalid'
  | 'migrated'
  | 'error';

export interface CompanionMigrationResult {
  migrated: boolean;
  reason: CompanionMigrationReason;
  backupPath?: string;
  /** 매 턴 예산을 맞추기 위해 inject:"session"으로 자동 강등된 섹션 key들 */
  demotedToSession?: string[];
}

const IDENTITY_RELATIVE = ['.maencof-meta', 'companion-identity.json'];

/**
 * 매 턴 예산(500)을 초과하면 turn 대상(inject turn|both) 중 salience 낮은 것부터
 * inject:"session"으로 강등해 예산 내로 맞춘다. v1→v2 매핑이 합성한 inject 기본값을
 * 조정하는 것이며(사용자 저작값 아님) turn 대상이 소진되면 멈춘다. 반환은 강등된 key 목록.
 */
function demoteToFitTurnBudget(sections: CompanionSectionMinimal[]): {
  sections: CompanionSectionMinimal[];
  demoted: string[];
} {
  const out = sections.map((s) => ({ ...s }));
  const demoted: string[] = [];
  while (assertTurnBudget(out).total > TURN_IDENTITY_CHAR_BUDGET) {
    const target = out
      .map((s, index) => ({ s, index }))
      .filter(({ s }) => s.inject === 'turn' || s.inject === 'both')
      .sort((a, b) => a.s.salience - b.s.salience || a.index - b.index)[0];
    if (!target) break;
    out[target.index] = { ...target.s, inject: 'session' };
    demoted.push(target.s.key);
  }
  return { sections: out, demoted };
}

/**
 * 레거시→정본 마이그레이션을 1회 수행한다. serverEntry가 매 기동 호출해도 안전(멱등).
 */
export function runCompanionMigration(cwd: string): CompanionMigrationResult {
  const identityPath = join(cwd, ...IDENTITY_RELATIVE);
  try {
    if (!existsSync(identityPath))
      return { migrated: false, reason: 'no-file' };

    const raw: unknown = JSON.parse(readFileSync(identityPath, 'utf-8'));
    if (getCompanionSchemaVersion(raw) >= 2)
      return { migrated: false, reason: 'already-current' };

    const normalized = normalizeCompanionIdentity(raw);
    if (!normalized) {
      appendErrorLogSafe(cwd, {
        hook: 'companion-migration',
        error:
          'companion-identity.json invalid (missing name/greeting); migration skipped',
        timestamp: new Date().toISOString(),
      });
      return { migrated: false, reason: 'invalid' };
    }

    const now = new Date().toISOString();
    const candidate: CompanionIdentity = {
      schema_version: 2,
      name: normalized.name,
      greeting: normalized.greeting,
      sections: normalized.sections,
      created_at: toIsoDatetime(normalized.created_at, now),
      updated_at: now,
    };

    const parsed = CompanionIdentitySchema.safeParse(candidate);
    if (!parsed.success) {
      appendErrorLogSafe(cwd, {
        hook: 'companion-migration',
        error: `canonical schema validation failed: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
        timestamp: now,
      });
      return { migrated: false, reason: 'invalid' };
    }

    // §B1: 매 턴 예산 초과 시 저살리언스 turn 섹션을 session으로 자동 강등해 500 이내로 맞춘다.
    const fitted = demoteToFitTurnBudget(parsed.data.sections);
    const finalData: CompanionIdentity =
      fitted.demoted.length > 0
        ? { ...parsed.data, sections: fitted.sections }
        : parsed.data;
    if (fitted.demoted.length > 0)
      appendErrorLogSafe(cwd, {
        hook: 'companion-migration',
        error: `turn identity budget exceeded after migration; auto-demoted to inject:"session" to fit ${TURN_IDENTITY_CHAR_BUDGET} chars: ${fitted.demoted.join(', ')}`,
        timestamp: now,
      });

    const backupPath = backupPathFor(identityPath);
    copyFileSync(identityPath, backupPath);
    writeFileSync(
      identityPath,
      JSON.stringify(finalData, null, 2) + '\n',
      'utf-8',
    );

    return {
      migrated: true,
      reason: 'migrated',
      backupPath,
      demotedToSession: fitted.demoted.length > 0 ? fitted.demoted : undefined,
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
