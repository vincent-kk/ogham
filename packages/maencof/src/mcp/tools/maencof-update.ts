/**
 * @file maencof-update.ts
 * @description maencof_update 도구 핸들러 — 기존 문서 수정
 */
import { readFile, writeFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { MaencofCrudResult, MaencofUpdateInput } from '../../types/mcp.js';
import { appendStaleNode } from '../shared.js';

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
 * 마크다운 문서의 Frontmatter를 부분 업데이트한다.
 */
function updateFrontmatter(
  content: string,
  updates: Partial<{
    tags: string[];
    title: string;
    layer: number;
    confidence: number;
    schedule: string;
  }>,
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
    yaml = patchFrontmatterField(yaml, 'schedule', updates.schedule);
  }

  return content.replace(match[0], `---\n${yaml}\n---\n`);
}

/**
 * maencof_update 핸들러
 */
export async function handleMaencofUpdate(
  vaultPath: string,
  input: MaencofUpdateInput,
): Promise<MaencofCrudResult> {
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
      message: `File not found: ${input.path}`,
    };
  }

  // Frontmatter 보존 + 본문 교체
  const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
  const fmMatch = FRONTMATTER_REGEX.exec(existing);
  let newContent: string;

  // 기존 본문 추출 (Frontmatter 이후 부분)
  const existingBody = fmMatch ? existing.slice(fmMatch[0].length) : existing;
  // content가 생략되면 기존 본문 유지
  const bodyToWrite = input.content ?? existingBody;

  if (fmMatch) {
    // Frontmatter 업데이트 (updated 자동 갱신 + 선택 필드)
    if (input.frontmatter) {
      const updatedDoc = updateFrontmatter(existing, input.frontmatter);
      const updatedFmBlock =
        FRONTMATTER_REGEX.exec(updatedDoc)?.[0] ?? fmMatch[0];
      newContent = updatedFmBlock + bodyToWrite;
    } else {
      // updated만 자동 갱신
      const today = new Date().toISOString().slice(0, 10);
      const updatedFmBlock = fmMatch[0].replace(
        /^(updated:).*$/m,
        `$1 ${today}`,
      );
      newContent = updatedFmBlock + bodyToWrite;
    }
  } else {
    // Frontmatter 없는 문서 → 내용만 교체
    newContent = bodyToWrite;
  }

  await writeFile(absolutePath, newContent, 'utf-8');

  // stale-nodes 무효화
  await appendStaleNode(vaultPath, input.path);

  return {
    success: true,
    path: input.path,
    message: `Document updated: ${input.path}`,
  };
}
