/**
 * @file knowledgeNodePathGate.test.ts
 * @description buildKnowledgeNode 경로 게이트 — 레이어 밖 경로는 유효 frontmatter 라도
 * 노드가 되지 않는다 (R2). 검증 전용 소비자는 allowNonLayerPath 로 옵트아웃한다.
 */
import { describe, expect, it } from 'vitest';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/documentParser/index.js';

const VALID_DOC = `---
created: 2026-08-19
updated: 2026-08-19
tags: [archive, sample]
layer: 4
---
# Doc
`;

function docAt(path: string) {
  return parseDocument(path, VALID_DOC, 1000);
}

describe('buildKnowledgeNode path gate', () => {
  it('유효 frontmatter 라도 서고 경로는 노드 구축을 거부한다', () => {
    const result = buildKnowledgeNode(docAt('99_Archive/2026/newsletter.md'));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/outside layer/);
  });

  it('vault 루트 문서도 거부한다', () => {
    expect(buildKnowledgeNode(docAt('rootnote.md')).success).toBe(false);
  });

  it('allowNonLayerPath 옵트아웃은 검증 전용 소비자의 구축을 허용한다', () => {
    const result = buildKnowledgeNode(docAt('99_Archive/2026/newsletter.md'), {
      allowNonLayerPath: true,
    });

    expect(result.success).toBe(true);
    expect(result.node?.path).toBe('99_Archive/2026/newsletter.md');
  });

  it('레이어 경로는 기본 게이트를 통과한다', () => {
    expect(buildKnowledgeNode(docAt('04_Action/2026/08/log.md')).success).toBe(
      true,
    );
  });
});
