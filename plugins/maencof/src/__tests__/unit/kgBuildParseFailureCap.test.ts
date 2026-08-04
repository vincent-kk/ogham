/**
 * @file kgBuildParseFailureCap.test.ts
 * @description capParseFailures — kg_build 응답의 파싱 실패 목록 상한.
 */
import { describe, expect, it } from 'vitest';

import { MAX_KG_BUILD_PARSE_FAILURES } from '../../constants/thresholds.js';
import { capParseFailures } from '../../mcp/tools/kgBuild/operations/capParseFailures.js';
import type { KgBuildParseFailure } from '../../mcp/tools/kgBuild/types/types.js';

function makeFailures(count: number): KgBuildParseFailure[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `broken-${i}.md`,
    errors: ['layer: Required'],
  }));
}

describe('capParseFailures', () => {
  it('상한 이내면 전체를 그대로 반환하고 total을 싣지 않는다', () => {
    const capped = capParseFailures(makeFailures(3));
    expect(capped.parseFailures).toHaveLength(3);
    expect(capped.parseFailuresTotal).toBeUndefined();
  });

  it('상한 초과면 앞쪽만 남기고 절단 전 총수를 보고한다', () => {
    const overflow = 5;
    const capped = capParseFailures(
      makeFailures(MAX_KG_BUILD_PARSE_FAILURES + overflow),
    );
    expect(capped.parseFailures).toHaveLength(MAX_KG_BUILD_PARSE_FAILURES);
    expect(capped.parseFailuresTotal).toBe(
      MAX_KG_BUILD_PARSE_FAILURES + overflow,
    );
  });
});
