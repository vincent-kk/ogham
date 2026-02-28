/**
 * @file document-parser.test.ts
 * @description DocumentParser 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  parseYamlFrontmatter,
  extractFrontmatter,
  extractLinks,
  parseDocument,
  buildKnowledgeNode,
} from '../../../core/document-parser.js';

// 유효한 frontmatter 마크다운 문서 생성 헬퍼
function makeDoc(frontmatter: string, body = '# Title\n\nContent here.'): string {
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

describe('parseYamlFrontmatter', () => {
  it('인라인 배열을 올바르게 파싱한다', () => {
    const result = parseYamlFrontmatter('tags: [a, b, c]');
    expect(result['tags']).toEqual(['a', 'b', 'c']);
  });

  it('블록 배열을 올바르게 파싱한다', () => {
    const yaml = `tags:\n  - item1\n  - item2`;
    const result = parseYamlFrontmatter(yaml);
    expect(result['tags']).toEqual(['item1', 'item2']);
  });

  it('숫자 값을 변환한다', () => {
    const result = parseYamlFrontmatter('layer: 2\nconfidence: 0.8');
    expect(result['layer']).toBe(2);
    expect(result['confidence']).toBe(0.8);
  });

  it('불리언 값을 변환한다', () => {
    const result = parseYamlFrontmatter('active: true\ndraft: false');
    expect(result['active']).toBe(true);
    expect(result['draft']).toBe(false);
  });

  it('따옴표 감싼 문자열을 처리한다', () => {
    const result = parseYamlFrontmatter('title: "My Document"');
    expect(result['title']).toBe('My Document');
  });

  it('날짜 형식 문자열을 문자열로 유지한다', () => {
    const result = parseYamlFrontmatter('created: 2026-02-28');
    expect(result['created']).toBe('2026-02-28');
  });

  it('빈 값이 있는 키를 처리한다', () => {
    const result = parseYamlFrontmatter('title:');
    // 빈 값은 undefined나 빈 배열 (블록 배열 없는 경우 스킵)
    expect(result['title']).toBeUndefined();
  });

  it('콜론 없는 줄은 무시한다', () => {
    const result = parseYamlFrontmatter('created: 2026-02-28\ninvalid line\nupdated: 2026-02-28');
    expect(result['created']).toBe('2026-02-28');
    expect(result['updated']).toBe('2026-02-28');
  });
});

describe('extractFrontmatter', () => {
  it('유효한 frontmatter를 파싱한다', () => {
    const content = makeDoc(VALID_FM);
    const { frontmatter, body } = extractFrontmatter(content);

    expect(frontmatter.success).toBe(true);
    expect(frontmatter.data?.created).toBe('2026-02-28');
    expect(frontmatter.data?.tags).toEqual(['core', 'identity']);
    expect(frontmatter.data?.layer).toBe(1);
    expect(body).toContain('# Title');
  });

  it('frontmatter 없는 문서를 처리한다', () => {
    const content = '# Just a title\n\nNo frontmatter here.';
    const { frontmatter, body } = extractFrontmatter(content);

    expect(frontmatter.success).toBe(false);
    expect(frontmatter.errors).toBeDefined();
    expect(body).toBe(content);
  });

  it('필수 필드 누락 시 실패한다', () => {
    const content = makeDoc('created: 2026-02-28\nupdated: 2026-02-28');
    const { frontmatter } = extractFrontmatter(content);

    expect(frontmatter.success).toBe(false);
    expect(frontmatter.errors?.some(e => e.includes('tags'))).toBe(true);
  });

  it('layer 범위 밖 값 시 실패한다', () => {
    const content = makeDoc('created: 2026-02-28\nupdated: 2026-02-28\ntags: [a]\nlayer: 5');
    const { frontmatter } = extractFrontmatter(content);

    expect(frontmatter.success).toBe(false);
  });

  it('선택 필드를 올바르게 파싱한다', () => {
    const content = makeDoc(VALID_FM_FULL);
    const { frontmatter } = extractFrontmatter(content);

    expect(frontmatter.success).toBe(true);
    expect(frontmatter.data?.title).toBe('My Notes');
    expect(frontmatter.data?.confidence).toBe(0.8);
    expect(frontmatter.data?.accessed_count).toBe(3);
  });

  it('본문이 frontmatter 이후 올바르게 추출된다', () => {
    const body = '# My Document\n\nThis is the content.';
    const content = makeDoc(VALID_FM, body);
    const result = extractFrontmatter(content);

    expect(result.body).toBe(body);
  });

  it('raw 필드에 원본 YAML을 저장한다', () => {
    const content = makeDoc(VALID_FM);
    const { frontmatter } = extractFrontmatter(content);

    expect(frontmatter.raw).toContain('created: 2026-02-28');
  });

  it('tags 배열이 비어있으면 실패한다', () => {
    const content = makeDoc('created: 2026-02-28\nupdated: 2026-02-28\ntags: []\nlayer: 1');
    const { frontmatter } = extractFrontmatter(content);

    expect(frontmatter.success).toBe(false);
  });
});

describe('extractLinks', () => {
  it('기본 마크다운 링크를 추출한다', () => {
    const body = 'See [identity](./01_Core/identity.md) for details.';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].text).toBe('identity');
    expect(links[0].href).toBe('./01_Core/identity.md');
    expect(links[0].isAbsolute).toBe(false);
  });

  it('여러 링크를 추출한다', () => {
    const body = '[A](./a.md) and [B](./b.md) and [C](./c.md)';
    const links = extractLinks(body);

    expect(links).toHaveLength(3);
    expect(links.map(l => l.href)).toEqual(['./a.md', './b.md', './c.md']);
  });

  it('상위 경로 링크를 처리한다', () => {
    const body = 'See [parent](../01_Core/identity.md)';
    const links = extractLinks(body);

    expect(links[0].href).toBe('../01_Core/identity.md');
    expect(links[0].isAbsolute).toBe(false);
  });

  it('http 링크를 절대 경로로 분류한다', () => {
    const body = 'Visit [example](https://example.com)';
    const links = extractLinks(body);

    expect(links[0].isAbsolute).toBe(true);
  });

  it('코드 블록 내 링크를 무시한다', () => {
    const body = '```\n[link](./file.md)\n```\n\nReal [link](./real.md)';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('./real.md');
  });

  it('인라인 코드 내 링크를 무시한다', () => {
    const body = '`[fake](./fake.md)` but [real](./real.md)';
    const links = extractLinks(body);

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('./real.md');
  });

  it('링크 없는 문서는 빈 배열을 반환한다', () => {
    const body = 'No links here, just plain text.';
    const links = extractLinks(body);

    expect(links).toHaveLength(0);
  });

  it('앵커 링크를 절대 경로로 분류한다', () => {
    const body = '[section](#heading)';
    const links = extractLinks(body);

    expect(links[0].isAbsolute).toBe(true);
  });
});

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
