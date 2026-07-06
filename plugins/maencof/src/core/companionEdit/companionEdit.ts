/**
 * @file companionEdit.ts
 * @description companion-identity.json v2 편집의 유일한 허가 채널(preview/commit 2단계).
 *
 * 로드(→ v1이면 v2 정규화) → 연산 적용(메모리) → 검증(Zod v2 + 500 예산 + brief 동기화)
 * → commit≠true면 diff만(파일 불변), commit이면 백업 후 저장. 예산·동기화 위반은 커밋 거부.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TURN_IDENTITY_CHAR_BUDGET } from '../../constants/companionIdentity.js';
import {
  type CompanionIdentityV2,
  CompanionIdentityV2Schema,
} from '../../types/companion.js';
import type { CompanionSectionMinimal } from '../../types/companionGuard.js';
import type {
  CompanionEditInput,
  CompanionEditResult,
  CompanionSectionPatch,
} from '../../types/mcpCompanion.js';
import { backupPathFor } from '../backupPath/index.js';
import {
  assertSessionBudget,
  assertTurnBudget,
  checkBriefSubsumption,
} from '../companionBudget/companionBudget.js';
import { normalizeToV2 } from '../companionNormalize/normalizeToV2.js';
import { toIsoDatetime } from '../companionNormalize/toIsoDatetime.js';

interface CoreFields {
  name: string;
  role?: string;
  greeting: string;
}

interface ApplyOk {
  sections: CompanionSectionMinimal[];
  core: CoreFields;
  summary: string;
}

type ApplyOutcome = ApplyOk | { error: string };

const IDENTITY_RELATIVE = ['.maencof-meta', 'companion-identity.json'];

function emptyBudget() {
  return {
    total: 0,
    budget: TURN_IDENTITY_CHAR_BUDGET,
    ok: true,
    offenders: [],
  };
}

function failResult(
  input: CompanionEditInput,
  message: string,
): CompanionEditResult {
  return {
    success: false,
    committed: false,
    operation: input.operation,
    changed: '',
    message,
    errors: [message],
    warnings: [],
    turn_budget: emptyBudget(),
    identity_preview: null,
  };
}

/** add_section용: 필수 필드가 모두 있는 완전한 section을 만든다. */
function buildSection(
  patch: CompanionSectionPatch | undefined,
): CompanionSectionMinimal | { error: string } {
  if (!patch?.key) return { error: 'add_section requires section.key' };
  if (!patch.inject)
    return { error: 'add_section requires section.inject (session|turn|both)' };
  if (patch.salience === undefined)
    return { error: 'add_section requires section.salience (1-5)' };
  if (!patch.detail) return { error: 'add_section requires section.detail' };
  return {
    key: patch.key,
    inject: patch.inject,
    salience: patch.salience,
    detail: patch.detail,
    brief: patch.brief,
    title: patch.title,
  };
}

/** update_section용: 제공된 필드만 병합한다(key는 정체성이라 불변). */
function mergeSection(
  existing: CompanionSectionMinimal,
  patch: CompanionSectionPatch,
): CompanionSectionMinimal {
  return {
    key: existing.key,
    inject: patch.inject ?? existing.inject,
    salience: patch.salience ?? existing.salience,
    detail: patch.detail ?? existing.detail,
    brief: patch.brief ?? existing.brief,
    title: patch.title ?? existing.title,
  };
}

function applyOperation(
  current: { sections: CompanionSectionMinimal[]; core: CoreFields },
  input: CompanionEditInput,
): ApplyOutcome {
  const sections = current.sections.map((s) => ({ ...s }));
  const core: CoreFields = { ...current.core };

  switch (input.operation) {
    case 'add_section': {
      const built = buildSection(input.section);
      if ('error' in built) return built;
      if (sections.some((s) => s.key === built.key))
        return {
          error: `Section "${built.key}" already exists; use update_section.`,
        };
      sections.push(built);
      return { sections, core, summary: `add_section "${built.key}"` };
    }
    case 'update_section': {
      if (!input.key) return { error: 'update_section requires key' };
      const idx = sections.findIndex((s) => s.key === input.key);
      if (idx === -1) return { error: `Section "${input.key}" not found.` };
      sections[idx] = mergeSection(sections[idx], input.section ?? {});
      return { sections, core, summary: `update_section "${input.key}"` };
    }
    case 'remove_section': {
      if (!input.key) return { error: 'remove_section requires key' };
      const idx = sections.findIndex((s) => s.key === input.key);
      if (idx === -1) return { error: `Section "${input.key}" not found.` };
      sections.splice(idx, 1);
      if (sections.length === 0)
        return {
          error:
            'Cannot remove the last section; a companion needs at least one section.',
        };
      return { sections, core, summary: `remove_section "${input.key}"` };
    }
    case 'update_core': {
      if (!input.core) return { error: 'update_core requires core' };
      if (input.core.name !== undefined) core.name = input.core.name;
      if (input.core.role !== undefined) core.role = input.core.role;
      if (input.core.greeting !== undefined)
        core.greeting = input.core.greeting;
      return { sections, core, summary: 'update_core' };
    }
  }
}

/**
 * companion_edit 핸들러 로직. preview(commit≠true)는 파일을 건드리지 않고,
 * commit은 검증 통과 시에만 백업 후 저장한다.
 */
export function applyCompanionEdit(
  vaultPath: string,
  input: CompanionEditInput,
): CompanionEditResult {
  const identityPath = join(vaultPath, ...IDENTITY_RELATIVE);

  let raw: unknown;
  try {
    if (!existsSync(identityPath))
      return failResult(
        input,
        'companion-identity.json not found. Run /maencof:setup to create a companion.',
      );
    raw = JSON.parse(readFileSync(identityPath, 'utf-8'));
  } catch (e) {
    return failResult(
      input,
      `Failed to read companion-identity.json: ${String(e)}`,
    );
  }

  const current = normalizeToV2(raw);
  if (!current)
    return failResult(
      input,
      'companion-identity.json invalid (missing name/greeting).',
    );

  const applied = applyOperation(
    {
      sections: current.sections,
      core: {
        name: current.name,
        role: current.role,
        greeting: current.greeting,
      },
    },
    input,
  );
  if ('error' in applied) return failResult(input, applied.error);

  const now = new Date().toISOString();
  const candidate: CompanionIdentityV2 = {
    schema_version: 2,
    name: applied.core.name,
    role: applied.core.role ?? '',
    greeting: applied.core.greeting,
    sections: applied.sections,
    created_at: toIsoDatetime(current.created_at, now),
    updated_at: now,
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = CompanionIdentityV2Schema.safeParse(candidate);
  if (!parsed.success)
    errors.push(
      ...parsed.error.issues.map(
        (i) => `${i.path.join('.') || 'root'}: ${i.message}`,
      ),
    );

  const turn = assertTurnBudget(candidate.sections);
  if (!turn.ok)
    errors.push(
      `Turn identity budget exceeded: ${turn.total}/${turn.budget} chars (over by ${turn.overBy}). Demote a section to inject:"session" or add a shorter brief. Largest: ${turn.offenders
        .slice(0, 3)
        .map((o) => `${o.key}(${o.chars})`)
        .join(', ')}.`,
    );

  const session = assertSessionBudget(candidate.sections);
  if (!session.ok)
    warnings.push(
      `Session identity is large: ${session.total}/${session.budget} chars (soft limit). Consider trimming detail.`,
    );

  for (const section of candidate.sections)
    errors.push(...checkBriefSubsumption(section).warnings);

  const turn_budget = {
    total: turn.total,
    budget: turn.budget,
    ok: turn.ok,
    offenders: turn.offenders,
  };
  const valid = errors.length === 0;

  if (input.commit !== true)
    return {
      success: valid,
      committed: false,
      operation: input.operation,
      changed: applied.summary,
      message: valid
        ? 'Preview only — re-run with commit:true to apply.'
        : 'Validation failed — fix the errors before commit.',
      errors,
      warnings,
      turn_budget,
      identity_preview: candidate,
    };

  if (!valid)
    return {
      success: false,
      committed: false,
      operation: input.operation,
      changed: applied.summary,
      message: 'Refused to commit — validation failed.',
      errors,
      warnings,
      turn_budget,
      identity_preview: candidate,
    };

  const backupPath = backupPathFor(identityPath);
  copyFileSync(identityPath, backupPath);
  writeFileSync(
    identityPath,
    JSON.stringify(parsed.success ? parsed.data : candidate, null, 2) + '\n',
    'utf-8',
  );

  return {
    success: true,
    committed: true,
    operation: input.operation,
    changed: applied.summary,
    message: `Committed: ${applied.summary}`,
    errors: [],
    warnings,
    turn_budget,
    identity_preview: parsed.success ? parsed.data : candidate,
    backup_path: backupPath,
  };
}
