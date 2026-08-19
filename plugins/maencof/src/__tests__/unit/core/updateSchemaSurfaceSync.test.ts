/**
 * @file updateSchemaSurfaceSync.test.ts
 * @description update 등록 스키마와 핸들러 직렬화 테이블의 키 집합 동기 —
 * AC-schema-serializer-sync. 2026-08-03 unset 스키마 누락 사고의 재발 방지.
 */
import { describe, expect, it } from 'vitest';

import { updateFrontmatterInputSchema } from '../../../mcp/server/registrations/operations/crud.js';
import { FM_FIELD_SERIALIZERS } from '../../../mcp/tools/maencofUpdate/maencofUpdate.js';

describe('update frontmatter 표면 동기', () => {
  it('등록 스키마 키 == 직렬화 테이블 키 ∪ {hub, unset}', () => {
    const schemaKeys = [
      ...Object.keys(updateFrontmatterInputSchema.shape),
    ].sort();
    const expected = [
      ...Object.keys(FM_FIELD_SERIALIZERS),
      'hub',
      'unset',
    ].sort();
    expect(schemaKeys).toEqual(expected);
  });
});
