/**
 * @file readL1Summary.ts
 * @description Compose a compact summary of L1 core nodes for turn-context.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  L1_EXCERPT_MAX_CHARS,
  L1_GIST_MAX_CHARS,
} from '../../constants/performance.js';

import { compressMarkdownBody } from './compressMarkdown.js';
import { capGist, extractGist } from './extractGist.js';
import { readCachedNodesArray } from './readCachedNodesArray.js';

interface IndexNode {
  layer?: number;
  path?: string;
  title?: string;
  tags?: string[];
  gist?: string;
}

/**
 * 노드 하나의 turn-context 발췌를 만든다.
 * 인덱싱된 `gist` 가 있으면 파일 재파싱 없이 그대로 사용하고,
 * 없으면 파일을 읽어 frontmatter gist → 본문 절단(+ `⚠ no gist`) 순으로 폴백한다.
 * 렌더 대상이 없으면 null.
 */
function resolveL1Excerpt(cwd: string, node: IndexNode): string | null {
  if (typeof node.gist === 'string') {
    const indexed = capGist(node.gist, L1_GIST_MAX_CHARS);
    if (indexed) return indexed;
  }
  if (!node.path) return null;
  const filePath = join(cwd, node.path);
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, 'utf-8');
  return (
    extractGist(content, L1_GIST_MAX_CHARS) ??
    `${compressMarkdownBody(content, L1_EXCERPT_MAX_CHARS)} ⚠ no gist`
  );
}

/**
 * L1 노드들을 읽고 "[title]: excerpt | tags:..." 라인으로 직렬화한다.
 * 부재/오류 시 빈 문자열 반환.
 */
export function readL1NodesSummary(cwd: string): string {
  const nodes = readCachedNodesArray<IndexNode>(cwd);
  const l1Nodes = nodes.filter((n) => n.layer === 1);
  if (l1Nodes.length === 0) return '';

  const lines: string[] = [];
  for (const node of l1Nodes) {
    if (!node.title) continue;
    let excerpt: string | null;
    try {
      excerpt = resolveL1Excerpt(cwd, node);
    } catch {
      excerpt = null;
    }
    if (excerpt === null) continue;

    const tagPart =
      node.tags && node.tags.length > 0
        ? ` | tags: ${node.tags.slice(0, 3).join(',')}`
        : '';
    lines.push(`[${node.title}]: ${excerpt}${tagPart}`);
  }
  return lines.join('\n');
}
