/**
 * @file buildL1CoreBlock.ts
 * @description Assemble the full-text `<l1-core-full>` block injected once at SessionStart.
 *
 * 매 턴 `<l1-core>` 가 gist(문서당 요약)만 나르는 것과 짝을 이룬다. 여기서는 L1 본문을
 * frontmatter 만 제거한 채 절단 없이 전량 싣는다 — 세션 1회용 authoritative 원문.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FRONTMATTER_STRIP_REGEX } from '../../constants/regexes.js';

import { readCachedNodesArray } from './readCachedNodesArray.js';

interface IndexNode {
  layer?: number;
  path?: string;
  title?: string;
}

const PREAMBLE =
  'Your complete Layer 1 core-knowledge documents, injected in full once at session start. Per-turn context carries only their short gists — treat these full versions as the source of truth.';

/**
 * L1 노드 전체 본문(frontmatter 제거, 무절단)을 `<l1-core-full>` 블록으로 만든다.
 * L1 이 없거나 모두 빈 본문이면 빈 문자열을 반환한다(호출부가 세그먼트에서 생략).
 */
export function buildL1CoreBlock(cwd: string): string {
  const nodes = readCachedNodesArray<IndexNode>(cwd);
  const l1Nodes = nodes.filter((n) => n.layer === 1);
  if (l1Nodes.length === 0) return '';

  const docs: string[] = [];
  for (const node of l1Nodes) {
    if (!node.path || !node.title) continue;
    try {
      const filePath = join(cwd, node.path);
      if (!existsSync(filePath)) continue;
      const body = readFileSync(filePath, 'utf-8')
        .replace(FRONTMATTER_STRIP_REGEX, '')
        .trim();
      if (body.length === 0) continue;
      const title = node.title.replace(/"/g, "'");
      docs.push(`<doc title="${title}">\n${body}\n</doc>`);
    } catch {
      // skip this node
    }
  }
  if (docs.length === 0) return '';

  return `<l1-core-full>\n${PREAMBLE}\n\n${docs.join('\n\n')}\n</l1-core-full>`;
}
