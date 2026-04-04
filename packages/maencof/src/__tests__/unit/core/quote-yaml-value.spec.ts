/**
 * @file quote-yaml-value.spec.ts
 * @description quoteYamlValue 유닛 테스트
 */
import { describe, expect, it } from 'vitest';

import {
  parseScalarValue,
  parseYamlFrontmatter,
  quoteYamlValue,
} from '../../../core/yaml-parser/yaml-parser.js';

// ─── quoteYamlValue ───────────────────────────────────────────────────────────

describe('quoteYamlValue', () => {
  it('특수문자 없는 문자열은 그대로 반환한다', () => {
    expect(quoteYamlValue('simple')).toBe('simple');
    expect(quoteYamlValue('hello-world')).toBe('hello-world');
  });

  it('": " 포함 시 double-quote로 감싼다', () => {
    expect(quoteYamlValue('Show GN: hello')).toBe('"Show GN: hello"');
    expect(quoteYamlValue('CVE: 2025-1234')).toBe('"CVE: 2025-1234"');
  });

  it('"#" 시작 시 double-quote로 감싼다', () => {
    expect(quoteYamlValue('#comment')).toBe('"#comment"');
  });

  it('빈 문자열은 "" 반환한다', () => {
    expect(quoteYamlValue('')).toBe('""');
  });

  it('quoting 트리거 시 내부 double-quote를 이스케이프한다', () => {
    // ": " 포함으로 quoting 트리거 → 내부 " 이스케이프
    expect(quoteYamlValue('A: has "quotes"')).toBe('"A: has \\"quotes\\""');
  });

  it('YAML 키워드(true/false/null)를 quote 처리한다', () => {
    expect(quoteYamlValue('true')).toBe('"true"');
    expect(quoteYamlValue('false')).toBe('"false"');
    expect(quoteYamlValue('null')).toBe('"null"');
  });

  it('parseScalarValue와 round-trip이 성립한다', () => {
    const inputs = ['Show GN: hello', '#comment', 'true', 'has "quotes"', ''];
    for (const input of inputs) {
      expect(parseScalarValue(quoteYamlValue(input))).toBe(input);
    }
  });

  it('double-quote로 감싼 ": " 포함 값을 올바르게 파싱한다', () => {
    const result = parseYamlFrontmatter(
      'title: "Show GN: 이제 공부도 클로드 코드로 해보세요!"',
    );
    expect(result['title']).toBe(
      'Show GN: 이제 공부도 클로드 코드로 해보세요!',
    );
  });
});
