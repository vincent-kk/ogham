/**
 * @file resolveAndAttachLinks.ts
 * @description 수집된 링크를 해석하고 노드에 outboundLinks를 부착한다.
 * - 상대 경로 (./、../): 소스 파일 디렉토리 기준으로 resolve
 * - vault-root-relative 경로: 그대로 사용
 * - stem-only 폴백: 직접 매칭 실패 시 파일명으로 역인덱스 조회
 */
import { posix } from 'node:path';

import type { NodeId } from '../../../../types/common.js';
import type { KnowledgeNode } from '../../../../types/graph.js';

import { buildStemIndex } from './buildStemIndex.js';

/** @internal 테스트용 export */
export function resolveAndAttachLinks(
  nodes: Map<NodeId, KnowledgeNode>,
  allLinks: Array<{ from: string; to: string }>,
): void {
  const nodePathSet = new Set(Array.from(nodes.values()).map((n) => n.path));
  let stemIndex: Map<string, string> | undefined;

  const linksBySource = new Map<string, string[]>();
  for (const link of allLinks) {
    if (!linksBySource.has(link.from)) linksBySource.set(link.from, []);
    const sourceDir = posix.dirname(link.from);
    const isRelative = link.to.startsWith('./') || link.to.startsWith('../');
    // 상대 경로 해석: ./、../ → vault-root-relative
    let resolved = isRelative
      ? posix.normalize(posix.join(sourceDir, link.to))
      : link.to;

    // stem-only 폴백: 직접 매칭 실패 시 파일명으로 역인덱스 조회
    if (!isRelative && !nodePathSet.has(resolved)) {
      if (!stemIndex) stemIndex = buildStemIndex(nodes);
      const filename = posix.basename(resolved);
      const stemResolved = stemIndex.get(filename);
      if (stemResolved) resolved = stemResolved;
    }

    linksBySource.get(link.from)!.push(resolved);
  }
  for (const [sourcePath, targets] of linksBySource) {
    const nodeId = sourcePath as NodeId;
    const node = nodes.get(nodeId);
    if (node) node.outboundLinks = targets;
  }
}
