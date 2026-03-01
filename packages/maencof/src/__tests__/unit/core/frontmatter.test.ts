/**
 * @file frontmatter.test.ts
 * @description parseYamlFrontmatter + extractFrontmatter 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import { extractFrontmatter } from '../../../core/document-parser.js';
import { parseYamlFrontmatter } from '../../../core/yaml-parser.js';

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

// ─── parseYamlFrontmatter ─────────────────────────────────────────────────────

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
    const result = parseYamlFrontmatter(
      'created: 2026-02-28\ninvalid line\nupdated: 2026-02-28',
    );
    expect(result['created']).toBe('2026-02-28');
    expect(result['updated']).toBe('2026-02-28');
  });
});

// ─── extractFrontmatter ───────────────────────────────────────────────────────

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
    expect(frontmatter.errors?.some((e) => e.includes('tags'))).toBe(true);
  });

  it('layer 범위 밖 값 시 실패한다', () => {
    const content = makeDoc(
      'created: 2026-02-28\nupdated: 2026-02-28\ntags: [a]\nlayer: 6',
    );
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
    const content = makeDoc(
      'created: 2026-02-28\nupdated: 2026-02-28\ntags: []\nlayer: 1',
    );
    const { frontmatter } = extractFrontmatter(content);

    expect(frontmatter.success).toBe(false);
  });
});
