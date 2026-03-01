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
  // 따옴표 제거
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
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
