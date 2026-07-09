/**
 * @file buildStemIndex.ts
 * @description 파일명(stem) → 풀 경로 역인덱스를 구축한다.
 * 동일 파일명이 여러 경로에 존재하면 정렬 순서상 첫 번째 경로를 사용한다.
 */
import { posix } from 'node:path';

import type { NodeId } from '../../../../types/common.js';
import type { KnowledgeNode } from '../../../../types/graph.js';

/** @internal 테스트용 export */
export function buildStemIndex(
  nodes: Map<NodeId, KnowledgeNode>,
): Map<string, string> {
  const stemIndex = new Map<string, string>();
  const sortedPaths = Array.from(nodes.values())
    .map((n) => n.path)
    .sort();
  for (const fullPath of sortedPaths) {
    const filename = posix.basename(fullPath);
    if (!stemIndex.has(filename)) stemIndex.set(filename, fullPath);
  }
  return stemIndex;
}
