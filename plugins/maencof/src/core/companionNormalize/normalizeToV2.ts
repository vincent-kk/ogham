/**
 * @file normalizeToV2.ts
 * @description companion-identity raw JSON을 v2 최소 형태로 정규화 (Zod-free).
 *
 * v1(고정 8필드)·v2·부분 파일을 모두 수용해 렌더 경로가 마이그레이션 이전에도
 * graceful하게 동작하게 하고, 파일 마이그레이션(companionMigration)이 동일 매핑을
 * 재사용하게 하는 단일 진실 원천. name·greeting이 없으면 null.
 */
import {
  type CompanionIdentityV2Minimal,
  type CompanionSectionMinimal,
  getCompanionSchemaVersion,
} from '../../types/companionGuard.js';

type Inject = CompanionSectionMinimal['inject'];

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      )
    : [];
}

/** 이미 v2인 파일의 개별 section을 graceful하게 소독한다(렌더 경로 관용성). */
function sanitizeSection(raw: unknown): CompanionSectionMinimal | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const key = asTrimmed(o.key);
  const detail = asTrimmed(o.detail);
  if (!key || !detail) return null;

  const inject: Inject =
    o.inject === 'session' || o.inject === 'turn' || o.inject === 'both'
      ? o.inject
      : 'both';

  let salience =
    typeof o.salience === 'number' && Number.isFinite(o.salience)
      ? Math.round(o.salience)
      : 3;
  if (salience < 1) salience = 1;
  if (salience > 5) salience = 5;

  const brief = asTrimmed(o.brief) || undefined;
  const title = asTrimmed(o.title) || undefined;
  return { key, inject, salience, detail, brief, title };
}

/** v1 personality(객체 또는 서술형 string) → tone/approach/traits section. */
function mapPersonality(personality: unknown): CompanionSectionMinimal[] {
  if (typeof personality === 'string') {
    const detail = personality.trim();
    return detail ? [{ key: 'tone', inject: 'both', salience: 5, detail }] : [];
  }
  if (personality === null || typeof personality !== 'object') return [];

  const p = personality as Record<string, unknown>;
  const out: CompanionSectionMinimal[] = [];
  const tone = asTrimmed(p.tone);
  if (tone)
    out.push({ key: 'tone', inject: 'both', salience: 5, detail: tone });
  const approach = asTrimmed(p.approach);
  if (approach)
    out.push({
      key: 'approach',
      inject: 'turn',
      salience: 4,
      detail: approach,
    });
  const traits = asStringArray(p.traits);
  if (traits.length)
    out.push({
      key: 'traits',
      inject: 'turn',
      salience: 3,
      detail: traits.join(', '),
    });
  return out;
}

/**
 * raw JSON을 v2 최소 형태로 정규화한다. name/greeting이 없으면 null.
 * schema_version ≥ 2면 section 소독만, 그 외엔 v1 필드 매핑(§7-2)을 적용한다.
 */
export function normalizeToV2(raw: unknown): CompanionIdentityV2Minimal | null {
  if (raw === null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const name = asTrimmed(obj.name);
  const greeting = asTrimmed(obj.greeting);
  if (!name || !greeting) return null;

  const role = asTrimmed(obj.role) || undefined;
  const created_at = asTrimmed(obj.created_at) || undefined;
  const updated_at = asTrimmed(obj.updated_at) || undefined;

  if (getCompanionSchemaVersion(raw) >= 2) {
    const sections = Array.isArray(obj.sections)
      ? obj.sections
          .map(sanitizeSection)
          .filter((s): s is CompanionSectionMinimal => s !== null)
      : [];
    return {
      schema_version: 2,
      name,
      role,
      greeting,
      sections,
      created_at,
      updated_at,
    };
  }

  const sections: CompanionSectionMinimal[] = [
    ...mapPersonality(obj.personality),
  ];

  const principles = asStringArray(obj.principles);
  if (principles.length)
    sections.push({
      key: 'principles',
      inject: 'both',
      salience: 4,
      detail: principles.join(' | '),
    });

  const taboos = asStringArray(obj.taboos);
  if (taboos.length)
    sections.push({
      key: 'taboos',
      inject: 'both',
      salience: 5,
      detail: taboos.join(' | '),
    });

  const origin = asTrimmed(obj.origin_story);
  if (origin)
    sections.push({
      key: 'origin',
      inject: 'session',
      salience: 1,
      detail: origin,
    });

  return {
    schema_version: 2,
    name,
    role,
    greeting,
    sections,
    created_at,
    updated_at,
  };
}
