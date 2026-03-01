/**
 * @file knowledge-node.test.ts
 * @description parseDocument + buildKnowledgeNode 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/document-parser.js';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function makeDoc(
  frontmatter: string,
  body = '# Title\n\nContent here.',
): string {
  return `---\n${frontmatter}\n---\n${body}`;
}

const VALID_FM = `created: 2026-02-28
updated: 2026-02-28
tags: [core, identity]
layer: 1`;

const VALID_FM_FULL = `created: 2026-02-28
updated: 2026-02-28
tags: [knowledge, notes]
layer: 2
title: My Notes
confidence: 0.8
accessed_count: 3`;

// ─── parseDocument ────────────────────────────────────────────────────────────

describe('parseDocument', () => {
  it('유효한 문서를 파싱한다', () => {
    const content = makeDoc(VALID_FM, '# Title\n\nSee [ref](./ref.md).');
    const doc = parseDocument('01_Core/identity.md', content, 1000);

    expect(doc.relativePath).toBe('01_Core/identity.md');
    expect(doc.frontmatter.success).toBe(true);
    expect(doc.links).toHaveLength(1);
    expect(doc.links[0].href).toBe('./ref.md');
    expect(doc.mtime).toBe(1000);
  });

  it('frontmatter 없는 문서도 파싱한다 (실패 표시)', () => {
    const content = '# Just title\n\nNo frontmatter.';
    const doc = parseDocument('orphan.md', content, 500);

    expect(doc.relativePath).toBe('orphan.md');
    expect(doc.frontmatter.success).toBe(false);
    expect(doc.body).toContain('# Just title');
  });
});

// ─── buildKnowledgeNode ───────────────────────────────────────────────────────

describe('buildKnowledgeNode', () => {
  it('유효한 ParsedDocument로부터 KnowledgeNode를 구성한다', () => {
    const content = makeDoc(VALID_FM, '# Identity\n\nCore document.');
    const doc = parseDocument('01_Core/identity.md', content, 1000);
    const result = buildKnowledgeNode(doc);

    expect(result.success).toBe(true);
    expect(result.node).toBeDefined();
    expect(result.node?.id).toBe('01_Core/identity.md');
    expect(result.node?.path).toBe('01_Core/identity.md');
    expect(result.node?.layer).toBe(1);
    expect(result.node?.tags).toEqual(['core', 'identity']);
    expect(result.node?.created).toBe('2026-02-28');
    expect(result.node?.mtime).toBe(1000);
    expect(result.node?.accessed_count).toBe(0);
  });

  it('frontmatter title이 노드 title에 사용된다', () => {
    const content = makeDoc(VALID_FM_FULL, '# Heading Title\n\nContent.');
    const doc = parseDocument('02_Derived/notes.md', content, 2000);
    const result = buildKnowledgeNode(doc);

    expect(result.success).toBe(true);
    expect(result.node?.title).toBe('My Notes'); // frontmatter title 우선
  });

  it('frontmatter title 없으면 H1 헤딩을 사용한다', () => {
    const content = makeDoc(VALID_FM, '# My Heading\n\nContent.');
    const doc = parseDocument('01_Core/identity.md', content, 1000);
    const result = buildKnowledgeNode(doc);

    expect(result.success).toBe(true);
    expect(result.node?.title).toBe('My Heading');
  });

  it('헤딩도 없으면 파일 경로를 title로 사용한다', () => {
    const content = makeDoc(VALID_FM, 'Just content, no heading.');
    const doc = parseDocument('01_Core/identity.md', content, 1000);
    const result = buildKnowledgeNode(doc);

    expect(result.success).toBe(true);
    expect(result.node?.title).toBe('01_Core/identity.md');
  });

  it('frontmatter 파싱 실패 시 실패 결과를 반환한다', () => {
    const content = '# No frontmatter\n\nContent.';
    const doc = parseDocument('orphan.md', content, 500);
    const result = buildKnowledgeNode(doc);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.node).toBeUndefined();
  });

  it('accessed_count 기본값은 0이다', () => {
    const content = makeDoc(VALID_FM);
    const doc = parseDocument('01_Core/identity.md', content, 1000);
    const result = buildKnowledgeNode(doc);

    expect(result.node?.accessed_count).toBe(0);
  });

  it('accessed_count frontmatter 값을 사용한다', () => {
    const content = makeDoc(VALID_FM_FULL);
    const doc = parseDocument('02_Derived/notes.md', content, 2000);
    const result = buildKnowledgeNode(doc);

    expect(result.node?.accessed_count).toBe(3);
  });
});
