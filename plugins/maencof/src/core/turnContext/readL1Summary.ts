/**
 * @file readL1Summary.ts
 * @description Compose a compact summary of L1 core nodes for turn-context.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { compressMarkdownBody } from './compressMarkdown.js';
import { readCachedNodesArray } from './readCachedNodesArray.js';

interface IndexNode {
  layer?: number;
  path?: string;
  title?: string;
  tags?: string[];
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
    if (!node.path || !node.title) continue;
    try {
      const filePath = join(cwd, node.path);
      if (!existsSync(filePath)) continue;
      const content = readFileSync(filePath, 'utf-8');
      const excerpt = compressMarkdownBody(content);
      const tagPart =
        node.tags && node.tags.length > 0
          ? ` | tags: ${node.tags.slice(0, 3).join(',')}`
          : '';
      lines.push(`[${node.title}]: ${excerpt}${tagPart}`);
    } catch {
      // skip this node
    }
  }
  return lines.join('\n');
}
