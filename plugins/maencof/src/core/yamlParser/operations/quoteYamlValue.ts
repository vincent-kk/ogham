/**
 * @file quoteYamlValue.ts
 * @description YAML 직렬화 시 특수문자를 포함하는 문자열을 안전하게 double-quote로 감싼다.
 *
 * @limitation 콤마를 포함하는 값은 인라인 배열(`[val1, val2]`) 형식에서
 * 정상 파싱되지 않음. 인라인 배열 파서가 콤마 기반 단순 split을 사용하기 때문.
 * 콤마 포함 값이 필요한 경우 블록 형식 배열 사용 권장.
 */
import {
  YAML_BOOLEAN_NULL,
  YAML_UNSAFE_START,
} from '../../../constants/regexes.js';

export function quoteYamlValue(value: string): string {
  if (value === '') return '""';

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
