/**
 * @file yaml-parser.ts
 * @description 경량 YAML frontmatter 파서 (regex 기반, gray-matter 의존 없음)
 *
 * 지원 형식:
 * - 스칼라: key: value
 * - 배열 (인라인): key: [a, b, c]
 * - 배열 (블록): key:\n  - item
 * - 숫자/불리언: 자동 변환
 */

/**
 * 스칼라 YAML 값을 적절한 타입으로 변환한다.
 */
export function parseScalarValue(raw: string): unknown {
  // double-quote: unescape 처리 (YAML 스펙상 \" \\ escape 지원)
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  // single-quote: YAML 스펙상 escape 없음 ('' 로 리터럴 ' 표현)
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1);
  }

  // 불리언
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null' || raw === '~') return null;

  // 숫자
  const num = Number(raw);
  if (!isNaN(num) && raw !== '') return num;

  return raw;
}

/**
 * YAML 직렬화 시 특수문자를 포함하는 문자열을 안전하게 double-quote로 감싼다.
 *
 * @limitation 콤마를 포함하는 값은 인라인 배열(`[val1, val2]`) 형식에서
 * 정상 파싱되지 않음. 인라인 배열 파서가 콤마 기반 단순 split을 사용하기 때문.
 * 콤마 포함 값이 필요한 경우 블록 형식 배열 사용 권장.
 */
export function quoteYamlValue(value: string): string {
  if (value === '') return '""';

  const YAML_UNSAFE_START = /^[#'"{}[\],&*?|<>=!%@`\-]/;
  const YAML_BOOLEAN_NULL = /^(true|false|null|~|yes|no|on|off)$/i;

  if (
    value.includes(': ') ||
    value.includes(' #') ||
    YAML_UNSAFE_START.test(value) ||
    YAML_BOOLEAN_NULL.test(value)
  ) {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  return value;
}

/**
 * YAML frontmatter 블록에서 키-값 쌍을 파싱한다.
 *
 * @param yaml - YAML 문자열
 * @returns 파싱된 키-값 레코드
 */
export function parseYamlFrontmatter(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 빈 줄 건너뛰기
    if (!line.trim()) {
      i++;
      continue;
    }

    // key: value 패턴
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const valueRaw = line.slice(colonIdx + 1).trim();

    if (!key) {
      i++;
      continue;
    }

    // 인라인 배열: key: [a, b, c]
    if (valueRaw.startsWith('[') && valueRaw.endsWith(']')) {
      const inner = valueRaw.slice(1, -1);
      const items = inner
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter((s) => s.length > 0);
      result[key] = items;
      i++;
      continue;
    }

    // 블록 배열: 다음 줄이 "  - item" 패턴
    if (valueRaw === '') {
      const items: string[] = [];
      i++;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        const item = lines[i]
          .replace(/^\s+-\s+/, '')
          .trim()
          .replace(/^["']|["']$/g, '');
        items.push(item);
        i++;
      }
      if (items.length > 0) {
        result[key] = items;
      }
      continue;
    }

    // 스칼라 값 파싱
    result[key] = parseScalarValue(valueRaw);
    i++;
  }

  return result;
}
