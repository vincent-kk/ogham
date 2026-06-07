/**
 * @file maencofUpdate.ts
 * @description `update` 도구 핸들러 — 기존 문서 수정
 */
import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  FRONTMATTER_REGEX,
  FRONTMATTER_STRIP_REGEX,
} from '../../../constants/regexes.js';
import { deduplicateContent } from '../../../core/contentDedup/index.js';
import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/documentParser/index.js';
import {
  parseYamlFrontmatter,
  quoteYamlValue,
} from '../../../core/yamlParser/index.js';
import { Layer } from '../../../types/common.js';
import {
  AUTO_GENERATED_FM_KEYS,
  validateFrontmatter,
} from '../../../types/frontmatter.js';
import type { L1AmendmentRecord } from '../../../types/l1Amendment.js';
import type {
  MaencofCrudResult,
  MaencofUpdateFrontmatter,
  MaencofUpdateInput,
} from '../../../types/mcp.js';

/** unset 거부 대상 — 데이터 무결성 핵심 필드 */
const PROTECTED_UNSET_FIELDS = new Set(['created', 'updated', 'layer', 'tags']);

/**
 * Frontmatter 블록에서 특정 필드를 갱신한다.
 */
function patchFrontmatterField(
  yaml: string,
  key: string,
  value: string,
): string {
  const regex = new RegExp(`^(${key}:).*$`, 'm');
  if (regex.test(yaml)) {
    return yaml.replace(regex, `$1 ${value}`);
  }
  // 필드 없으면 추가
  return yaml + `\n${key}: ${value}`;
}

/**
 * Frontmatter 블록에서 키 라인을 제거한다 (unset 처리).
 * 라인 시작에서 매칭하며 끝의 줄바꿈도 함께 소거한다.
 */
function removeFrontmatterField(yaml: string, key: string): string {
  const regex = new RegExp(`^${key}:[^\\n]*\\n?`, 'gm');
  return yaml.replace(regex, '');
}

/**
 * 마크다운 문서의 Frontmatter를 부분 업데이트한다.
 */
function updateFrontmatter(
  content: string,
  updates: MaencofUpdateFrontmatter,
): string {
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) return content;

  let yaml = match[1];
  const today = new Date().toISOString().slice(0, 10);

  // updated 자동 갱신
  yaml = patchFrontmatterField(yaml, 'updated', today);

  // unset 먼저 처리 (머지 전 — 동일 키를 set+unset 시 set이 승리)
  if (updates.unset) {
    for (const key of updates.unset) {
      yaml = removeFrontmatterField(yaml, key);
    }
  }

  if (updates.tags !== undefined) {
    yaml = patchFrontmatterField(
      yaml,
      'tags',
      `[${updates.tags.map((t) => quoteYamlValue(t)).join(', ')}]`,
    );
  }
  if (updates.title !== undefined) {
    yaml = patchFrontmatterField(yaml, 'title', quoteYamlValue(updates.title));
  }
  if (updates.layer !== undefined) {
    yaml = patchFrontmatterField(yaml, 'layer', String(updates.layer));
  }
  if (updates.confidence !== undefined) {
    yaml = patchFrontmatterField(
      yaml,
      'confidence',
      String(updates.confidence),
    );
  }
  if (updates.schedule !== undefined) {
    yaml = patchFrontmatterField(
      yaml,
      'schedule',
      quoteYamlValue(updates.schedule),
    );
  }
  if (updates.sub_layer !== undefined) {
    yaml = patchFrontmatterField(yaml, 'sub_layer', updates.sub_layer);
  }

  return content.replace(match[0], `---\n${yaml}\n---\n`);
}

/**
 * `update` 핸들러
 */
export async function handleMaencofUpdate(
  vaultPath: string,
  input: MaencofUpdateInput,
): Promise<MaencofCrudResult> {
  const absolutePath = join(vaultPath, input.path);

  let existing: string;
  let mtime: number;
  try {
    const [raw, stats] = await Promise.all([
      readFile(absolutePath, 'utf-8'),
      stat(absolutePath),
    ]);
    existing = raw;
    mtime = stats.mtimeMs;
  } catch {
    return {
      success: false,
      path: input.path,
      message: `File not found: ${input.path}`,
    };
  }

  // ─── L1 3중 게이트 ─────────────────────────────────────────────
  const doc = parseDocument(input.path, existing, mtime);
  const nodeResult = buildKnowledgeNode(doc);
  const isL1 = nodeResult.success && nodeResult.node?.layer === Layer.L1_CORE;

  if (isL1) {
    if (!input.change_reason) {
      return {
        success: false,
        path: input.path,
        message:
          'Layer 1 modification requires a structured change_reason. ' +
          'Valid reasons: identity_evolution, error_correction, info_update, consolidation, reinterpretation. ' +
          'Recommended: Request identity-guardian agent for impact analysis first.',
      };
    }
    if (!input.justification || input.justification.length < 20) {
      return {
        success: false,
        path: input.path,
        message:
          'Layer 1 modification requires a justification (min 20 characters) explaining the change.',
      };
    }
    if (!input.confirm_l1) {
      return {
        success: false,
        path: input.path,
        message:
          'Layer 1 modification requires explicit confirmation. Set confirm_l1: true.',
      };
    }
    if (input.frontmatter?.layer !== undefined) {
      return {
        success: false,
        path: input.path,
        message:
          'The "layer" field of Layer 1 documents cannot be changed via update.',
      };
    }
    if (input.frontmatter?.unset && input.frontmatter.unset.length > 0) {
      return {
        success: false,
        path: input.path,
        message:
          'Layer 1 documents do not allow frontmatter.unset (use a structured amendment instead).',
      };
    }
  }

  // ─── unset 보호 필드 가드 (모든 레이어) ─────────────────────────
  if (input.frontmatter?.unset) {
    const blocked = input.frontmatter.unset.filter((k) =>
      PROTECTED_UNSET_FIELDS.has(k),
    );
    if (blocked.length > 0) {
      return {
        success: false,
        path: input.path,
        message: `Cannot unset protected frontmatter fields: ${blocked.join(', ')}`,
      };
    }
  }

  // Frontmatter 보존 + 본문 교체
  const fmMatch = FRONTMATTER_STRIP_REGEX.exec(existing);
  let newContent: string;

  // 기존 본문 추출 (Frontmatter 이후 부분)
  const existingBody = fmMatch ? existing.slice(fmMatch[0].length) : existing;
  // content가 생략되면 기존 본문 유지
  const bodyToWrite = input.content
    ? deduplicateContent(input.content, {
        title: undefined,
        generatedKeys: [...AUTO_GENERATED_FM_KEYS],
      }).content
    : existingBody;

  if (fmMatch) {
    // Frontmatter 블록 산출 (선택 필드 머지 또는 updated 자동 갱신)
    let updatedFmBlock: string;
    if (input.frontmatter) {
      const updatedDoc = updateFrontmatter(existing, input.frontmatter);
      updatedFmBlock =
        FRONTMATTER_STRIP_REGEX.exec(updatedDoc)?.[0] ?? fmMatch[0];
    } else {
      const today = new Date().toISOString().slice(0, 10);
      updatedFmBlock = fmMatch[0].replace(/^(updated:).*$/m, `$1 ${today}`);
    }

    // ─── 객체 단계 검증 (양 경로 공통, write-path 비대칭 제거) ───
    // content-only update 라도 손상된 디스크 frontmatter 가 영속화되지 않도록
    // 동일 schema 게이트를 통과해야만 write 한다. 회복은 frontmatter.unset 으로.
    const updatedFmYamlMatch = FRONTMATTER_REGEX.exec(updatedFmBlock);
    const updatedFmObject = parseYamlFrontmatter(updatedFmYamlMatch?.[1] ?? '');
    const validation = validateFrontmatter(updatedFmObject);
    if (!validation.ok) {
      return {
        success: false,
        path: input.path,
        message: `Frontmatter validation failed: ${validation.errors.join('; ')}. Use frontmatter.unset to recover corrupted fields.`,
      };
    }

    newContent = updatedFmBlock + bodyToWrite;
  } else {
    // Frontmatter 없는 문서 → 내용만 교체
    newContent = bodyToWrite;
  }

  await writeFile(absolutePath, newContent, 'utf-8');

  // ─── L1 audit log + warnings ──────────────────────────────────
  if (isL1) {
    const warnings: string[] = [];
    if (input.frontmatter?.tags) {
      warnings.push(
        'Tags changed: DOMAIN edges and inverted index will be affected. Run kg_build for consistency.',
      );
    }
    if (input.frontmatter?.title) {
      warnings.push(
        'Title changed: Document references and display names may need updating.',
      );
    }
    if (input.content) {
      warnings.push(
        'Content changed: Outbound links and SA activation weights may be affected.',
      );
    }
    warnings.push(
      'L1 amendment recorded. Graph cache invalidated; next read-path query will trigger incremental rebuild.',
    );

    // Audit log 기록
    const auditDir = join(vaultPath, '02_Derived', 'changelog', 'l1-audit');
    await mkdir(auditDir, { recursive: true });
    const auditPath = join(auditDir, 'l1-amendments.jsonl');
    const record: L1AmendmentRecord = {
      timestamp: new Date().toISOString(),
      path: input.path,
      change_reason: input.change_reason!,
      justification: input.justification!,
      change_type: input.content
        ? input.frontmatter
          ? 'both'
          : 'content'
        : 'frontmatter',
      snapshot_before: existing,
      diff_summary: `Updated: ${Object.keys(input.frontmatter ?? {}).join(', ') || 'content'}`,
      affected_areas: warnings,
    };
    await appendFile(auditPath, JSON.stringify(record) + '\n', 'utf-8');

    return {
      success: true,
      path: input.path,
      message: `Layer 1 document updated: ${input.path}`,
      warnings,
    };
  }

  return {
    success: true,
    path: input.path,
    message: `Document updated: ${input.path}`,
  };
}
