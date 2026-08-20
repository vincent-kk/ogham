/**
 * @file buildArchiveClusterIndex.ts
 * @description 서고 문서의 cluster_key 열거 인덱스 생성 — 노드·엣지에 관여하지 않는다.
 */
import { readFile } from 'node:fs/promises';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../../core/documentParser/index.js';
import { scanArchive } from '../../../../core/vaultScanner/index.js';
import type { ArchiveClusterMember } from '../../../../types/graph.js';

/**
 * 서고를 스캔해 cluster_key → 멤버 목록 인덱스를 만든다.
 *
 * @param vaultPath - vault 루트 절대 경로
 * @returns clusterKey 그룹 Map — 각 목록은 updated 내림차순, 동률 시 path 사전순.
 *   cluster_key 없는 문서·frontmatter 손상 문서·읽기 실패 문서는 제외된다 (non-fatal).
 */
export async function buildArchiveClusterIndex(
  vaultPath: string,
): Promise<Map<string, ArchiveClusterMember[]>> {
  const files = await scanArchive(vaultPath);
  const index = new Map<string, ArchiveClusterMember[]>();

  await Promise.all(
    files.map(async (file) => {
      try {
        const content = await readFile(file.absolutePath, 'utf-8');
        const doc = parseDocument(file.relativePath, content, file.mtime);
        const nodeResult = buildKnowledgeNode(doc, { allowNonLayerPath: true });
        if (!nodeResult.success || !nodeResult.node?.clusterKey) return;
        const member: ArchiveClusterMember = {
          clusterKey: nodeResult.node.clusterKey,
          path: nodeResult.node.path,
          title: nodeResult.node.title,
          updated: nodeResult.node.updated,
          tags: nodeResult.node.tags,
        };
        const list = index.get(member.clusterKey);
        if (list) list.push(member);
        else index.set(member.clusterKey, [member]);
      } catch {
        // 서고는 그래프 계약 밖 — 손상 문서는 인덱스에서 빠지고 빌드는 계속된다
      }
    }),
  );

  for (const list of index.values())
    list.sort(
      (a, b) =>
        b.updated.localeCompare(a.updated) || a.path.localeCompare(b.path),
    );

  return index;
}
