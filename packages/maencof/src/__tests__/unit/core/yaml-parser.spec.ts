/**
 * @file yaml-parser.spec.ts
 * @description parseYamlFrontmatter 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import { parseYamlFrontmatter } from '../../../core/yaml-parser/yaml-parser.js';

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
