/**
 * @file parseScalarValue.ts
 * @description 스칼라 YAML 값을 적절한 타입으로 변환한다.
 */
export function parseScalarValue(raw: string): unknown {
  // double-quote: unescape 처리 (YAML 스펙상 \" \\ escape 지원)
  if (raw.startsWith('"') && raw.endsWith('"'))
    return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  // single-quote: YAML 스펙상 escape 없음 ('' 로 리터럴 ' 표현)
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);

  // 불리언
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null' || raw === '~') return null;

  // 숫자
  const num = Number(raw);
  if (!isNaN(num) && raw !== '') return num;

  return raw;
}
