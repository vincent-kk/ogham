/**
 * @file coffaen-update.ts
 * @description coffaen_update 도구 핸들러 — 기존 문서 수정
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CoffaenUpdateInput, CoffaenCrudResult } from '../../types/mcp.js';
import { stat } from 'node:fs/promises';
import { appendStaleNode } from '../shared.js';

/**
 * Frontmatter 블록에서 특정 필드를 갱신한다.
 */
function patchFrontmatterField(yaml: string, key: string, value: string): string {
  const regex = new RegExp(`^(${key}:).*$`, 'm');
  if (regex.test(yaml)) {
    return yaml.replace(regex, `$1 ${value}`);
  }
  // 필드 없으면 추가
  return yaml + `\n${key}: ${value}`;
}

/**
 * 마크다운 문서의 Frontmatter를 부분 업데이트한다.
 */
function updateFrontmatter(
  content: string,
  updates: Partial<{ tags: string[]; title: string; confidence: number; schedule: string }>,
): string {
  const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) return content;

  let yaml = match[1];
  const today = new Date().toISOString().slice(0, 10);

  // updated 자동 갱신
  yaml = patchFrontmatterField(yaml, 'updated', today);

  if (updates.tags !== undefined) {
    yaml = patchFrontmatterField(yaml, 'tags', `[${updates.tags.join(', ')}]`);
  }
  if (updates.title !== undefined) {
    yaml = patchFrontmatterField(yaml, 'title', updates.title);
  }
  if (updates.confidence !== undefined) {
    yaml = patchFrontmatterField(yaml, 'confidence', String(updates.confidence));
  }
  if (updates.schedule !== undefined) {
    yaml = patchFrontmatterField(yaml, 'schedule', updates.schedule);
  }

  return content.replace(match[0], `---\n${yaml}\n---\n`);
}

/**
 * coffaen_update 핸들러
 */
export async function handleCoffaenUpdate(
  vaultPath: string,
  input: CoffaenUpdateInput,
): Promise<CoffaenCrudResult> {
  const absolutePath = join(vaultPath, input.path);

  let existing: string;
  try {
    const [raw, stats] = await Promise.all([
      readFile(absolutePath, 'utf-8'),
      stat(absolutePath),
    ]);
    existing = raw;
    void stats;
  } catch {
    return {
      success: false,
      path: input.path,
      message: `파일을 찾을 수 없습니다: ${input.path}`,
    };
  }

  // Frontmatter 보존 + 본문 교체
  const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
  const fmMatch = FRONTMATTER_REGEX.exec(existing);
  let newContent: string;

  if (fmMatch) {
    // Frontmatter 업데이트 (updated 자동 갱신 + 선택 필드)
    const updatedFm = input.frontmatter
      ? updateFrontmatter(existing, input.frontmatter)
      : (() => {
          // updated만 자동 갱신
          const today = new Date().toISOString().slice(0, 10);
          const fm = fmMatch[0];
          const updatedFmBlock = fm.replace(
            /^(updated:).*$/m,
            `$1 ${today}`,
          );
          return updatedFmBlock + input.content;
        })();

    if (input.frontmatter) {
      // updateFrontmatter가 전체 문서를 반환하므로, 본문 교체 필요
      const fmBlock = FRONTMATTER_REGEX.exec(updatedFm)?.[0] ?? fmMatch[0];
      newContent = fmBlock + input.content;
    } else {
      newContent = updatedFm;
    }
  } else {
    // Frontmatter 없는 문서 → 내용만 교체
    newContent = input.content;
  }

  await writeFile(absolutePath, newContent, 'utf-8');

  // stale-nodes 무효화
  await appendStaleNode(vaultPath, input.path);

  return {
    success: true,
    path: input.path,
    message: `문서가 수정되었습니다: ${input.path}`,
  };
}
