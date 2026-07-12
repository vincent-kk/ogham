/**
 * @file buildKnowledgeNode.ts
 * @description ParsedDocument로부터 KnowledgeNode를 구성한다.
 * Frontmatter 검증 실패 시 NodeBuildResult.success = false 반환.
 */
import type { Layer } from '../../../types/common.js';
import { toNodeId } from '../../../types/common.js';
import type { Frontmatter } from '../../../types/frontmatter.js';
import type { KnowledgeNode } from '../../../types/graph.js';
import type { NodeBuildResult, ParsedDocument } from '../types/types.js';

import { inferSubLayerFromPath } from './inferSubLayerFromPath.js';

/**
 * @param doc - 파싱된 문서
 * @returns KnowledgeNode 구성 결과
 */
export function buildKnowledgeNode(doc: ParsedDocument): NodeBuildResult {
  if (!doc.frontmatter.success || !doc.frontmatter.data)
    return {
      success: false,
      error: `Frontmatter validation failed: ${doc.frontmatter.errors?.join(', ')}`,
    };

  const fm: Frontmatter = doc.frontmatter.data;

  // 제목 추출: Frontmatter title → 첫 번째 # 헤딩 → 파일명
  const title = fm.title ?? extractHeadingTitle(doc.body) ?? doc.relativePath;

  const node: KnowledgeNode = {
    id: toNodeId(doc.relativePath),
    path: doc.relativePath,
    title,
    layer: fm.layer as Layer,
    tags: fm.tags,
    created: fm.created,
    updated: fm.updated,
    mtime: doc.mtime,
    accessed_count: fm.accessed_count ?? 0,
  };

  // Step 2.0a: person/domain 전파 (pre-existing bug fix)
  if (fm.person) node.person = fm.person;
  if (fm.domain) node.domain = fm.domain;
  if (fm.gist) node.gist = fm.gist;
  if (fm.archived) node.archived = fm.archived;

  // Step 2.0b: sub-layer 확장 필드 전파
  node.subLayer = fm.sub_layer ?? inferSubLayerFromPath(doc.relativePath);
  if (fm.connected_layers) node.connectedLayers = fm.connected_layers;
  if (fm.boundary_type) node.boundaryType = fm.boundary_type;
  if (fm.mentioned_persons) node.mentioned_persons = fm.mentioned_persons;

  return { success: true, node };
}

/**
 * 마크다운 본문에서 첫 번째 H1 헤딩을 추출한다.
 */
function extractHeadingTitle(body: string): string | undefined {
  const match = /^#\s+(.+)$/m.exec(body);
  return match?.[1]?.trim();
}
