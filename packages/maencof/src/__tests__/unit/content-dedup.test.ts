/**
 * @file content-dedup.test.ts
 * @description deduplicateContent 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import { deduplicateContent } from '../../core/content-dedup.js';
import { AUTO_GENERATED_FM_KEYS } from '../../types/frontmatter.js';

const GENERATED_KEYS = [...AUTO_GENERATED_FM_KEYS];

describe('deduplicateContent', () => {
  it('frontmatter가 없는 plain content는 그대로 반환한다', () => {
    const result = deduplicateContent('Hello world\n\nSome text.', {
      title: 'Test',
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe('Hello world\n\nSome text.');
    expect(result.warnings).toHaveLength(0);
  });

  it('빈 content는 빈 문자열을 반환한다', () => {
    const result = deduplicateContent('', {
      title: 'Test',
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe('');
    expect(result.warnings).toHaveLength(0);
  });

  it('generated keys와 겹치는 frontmatter 블록을 제거한다', () => {
    const content = [
      '---',
      'created: 2026-03-07',
      'tags: [test]',
      'layer: 2',
      '---',
      '본문 내용입니다.',
    ].join('\n');

    const result = deduplicateContent(content, {
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe('본문 내용입니다.');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Duplicate frontmatter removed');
  });

  it('generated keys와 겹치지 않는 frontmatter 블록은 유지한다', () => {
    const content = [
      '---',
      'custom_field: value',
      'another: data',
      '---',
      '본문.',
    ].join('\n');

    const result = deduplicateContent(content, {
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe(content);
    expect(result.warnings).toHaveLength(0);
  });

  it('title과 정확히 일치하는 H1 heading을 제거한다', () => {
    const result = deduplicateContent('# My Document\n\n본문 내용.', {
      title: 'My Document',
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe('본문 내용.');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Duplicate H1 heading removed');
  });

  it('title과 불일치하는 H1 heading은 유지한다', () => {
    const content = '# Different Title\n\n본문.';

    const result = deduplicateContent(content, {
      title: 'My Document',
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe(content);
    expect(result.warnings).toHaveLength(0);
  });

  it('H1 없이 H2만 존재하면 변경하지 않는다', () => {
    const content = '## Section Title\n\n본문.';

    const result = deduplicateContent(content, {
      title: 'Section Title',
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe(content);
    expect(result.warnings).toHaveLength(0);
  });

  it('frontmatter + H1 + 본문이 모두 포함되면 둘 다 제거한다', () => {
    const content = [
      '---',
      'created: 2026-03-07',
      'tags: [test]',
      'layer: 2',
      '---',
      '# Test Note',
      '',
      '실제 본문 내용.',
    ].join('\n');

    const result = deduplicateContent(content, {
      title: 'Test Note',
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe('실제 본문 내용.');
    expect(result.warnings).toHaveLength(2);
  });

  it('제거 후 leading blank lines를 정리한다', () => {
    const content = '# My Note\n\n\n\n본문.';

    const result = deduplicateContent(content, {
      title: 'My Note',
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe('본문.');
    expect(result.content.startsWith('\n')).toBe(false);
  });

  it('title이 없으면 H1 제거를 건너뛴다', () => {
    const content = '# Some Heading\n\n본문.';

    const result = deduplicateContent(content, {
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe(content);
    expect(result.warnings).toHaveLength(0);
  });

  it('content 중간의 --- 구분선은 frontmatter로 취급하지 않는다', () => {
    const content = '본문 시작.\n\n---\n\ncreated: 2026-01-01\n\n본문 끝.';

    const result = deduplicateContent(content, {
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe(content);
    expect(result.warnings).toHaveLength(0);
  });

  it('부분 일치하는 H1은 제거하지 않는다 (보수적 정책)', () => {
    const content = '# Test Note Extended\n\n본문.';

    const result = deduplicateContent(content, {
      title: 'Test Note',
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe(content);
    expect(result.warnings).toHaveLength(0);
  });

  it('frontmatter 내 키가 하나만 겹쳐도 전체 블록을 제거한다', () => {
    const content = [
      '---',
      'title: My Note',
      'custom: value',
      'another: data',
      '---',
      '본문.',
    ].join('\n');

    const result = deduplicateContent(content, {
      generatedKeys: GENERATED_KEYS,
    });

    expect(result.content).toBe('본문.');
    expect(result.warnings[0]).toContain('title');
  });
});
