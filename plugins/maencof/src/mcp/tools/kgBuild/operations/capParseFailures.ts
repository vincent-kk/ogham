/**
 * @file capParseFailures.ts
 * @description kg_build 응답의 parseFailures 상한 — 광범위 손상 시 응답 범람 방지.
 */
import { MAX_KG_BUILD_PARSE_FAILURES } from '../../../../constants/thresholds.js';
import type { KgBuildParseFailure } from '../types/types.js';

/**
 * 파싱 실패 목록에 상한을 적용한다.
 *
 * @param failures - 절단 전 전체 실패 목록
 * @returns 상한 이내면 원본 그대로, 초과면 앞쪽 `MAX_KG_BUILD_PARSE_FAILURES` 개와
 *   절단 전 총수(`parseFailuresTotal`)
 */
export function capParseFailures(failures: KgBuildParseFailure[]): {
  parseFailures: KgBuildParseFailure[];
  parseFailuresTotal?: number;
} {
  if (failures.length <= MAX_KG_BUILD_PARSE_FAILURES)
    return { parseFailures: failures };
  return {
    parseFailures: failures.slice(0, MAX_KG_BUILD_PARSE_FAILURES),
    parseFailuresTotal: failures.length,
  };
}
