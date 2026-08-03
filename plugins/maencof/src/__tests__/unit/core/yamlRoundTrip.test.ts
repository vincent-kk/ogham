/**
 * @file yamlRoundTrip.test.ts
 * @description 직렬화 → 파싱 왕복 불변식 회귀 방어.
 *
 * quoteYamlValue로 쓴 값은 parseYamlFrontmatter로 되읽었을 때 원래 타입과 값을
 * 유지해야 한다. 이 불변식이 깨지면 write는 성공하고 그 다음 read·update가 전부
 * 막힌다 — 객체 단계 검증만으로는 잡히지 않는 결함이다.
 */
import { describe, expect, it } from 'vitest';

import {
  parseYamlFrontmatter,
  quoteYamlValue,
} from '../../../core/yamlParser/index.js';

describe('YAML 왕복 불변식', () => {
  it('숫자 인라인 배열은 number[]로 되읽힌다', () => {
    expect(parseYamlFrontmatter('nums: [2, 3, 4]').nums).toEqual([2, 3, 4]);
  });

  it('숫자꼴 문자열 태그는 string으로 되읽힌다', () => {
    const tags = ['2026', 'ai', '3.14'];
    const yaml = `tags: [${tags.map(quoteYamlValue).join(', ')}]`;
    expect(parseYamlFrontmatter(yaml).tags).toEqual(tags);
  });

  it('블록 배열도 같은 규칙을 따른다', () => {
    const yaml = 'nums:\n  - 1\n  - 2\nstrs:\n  - "2026"\n  - ai';
    const parsed = parseYamlFrontmatter(yaml);
    expect(parsed.nums).toEqual([1, 2]);
    expect(parsed.strs).toEqual(['2026', 'ai']);
  });

  it('불리언·null 꼴 문자열도 타입을 유지한다', () => {
    const values = ['true', 'null', 'no'];
    const yaml = `tags: [${values.map(quoteYamlValue).join(', ')}]`;
    expect(parseYamlFrontmatter(yaml).tags).toEqual(values);
  });

  it('인용된 항목의 escape 처리는 스칼라 경로와 동일하다', () => {
    const yaml = String.raw`quoted: ["a\"b", 'plain']`;
    expect(parseYamlFrontmatter(yaml).quoted).toEqual(['a"b', 'plain']);
  });
});
