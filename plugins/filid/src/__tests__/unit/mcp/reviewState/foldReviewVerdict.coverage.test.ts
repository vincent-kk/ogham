import { describe, expect, it } from 'vitest';

import { foldReviewVerdict } from '../../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';

import { createVerdictFoldFixture } from './helpers/createVerdictFoldFixture.js';

describe('foldReviewVerdict coverage regression', () => {
  it.each([null, '', '   '])(
    'keeps an unassigned file with reason %j pending',
    (skipReason) => {
      const input = createVerdictFoldFixture();
      input.files = [{ ...input.files[0]!, skipReason }];
      input.groups = [];
      input.candidates = [];
      const result = foldReviewVerdict(input);
      expect(result.verdict).toBe('INCONCLUSIVE');
      expect(result.checklist[0]!.result).toBe('pending');
      expect(result.filesSkipped).toBe(0);
    },
  );

  it.each(['deleted path', 'generated artifact'])(
    'keeps %s exclusions neutral beside confirmed evidence',
    (skipReason) => {
      const input = createVerdictFoldFixture();
      input.files = [input.files[0]!, { ...input.files[1]!, skipReason }];
      const result = foldReviewVerdict(input);
      expect(result.verdict).toBe('REQUEST_CHANGES');
      expect(result.filesTotal).toBe(2);
      expect(result.filesReviewed).toBe(1);
      expect(result.filesSkipped).toBe(1);
      expect(result.confirmed).toHaveLength(1);
    },
  );

  it('approves complete review with neutral exclusions and no findings', () => {
    const input = createVerdictFoldFixture();
    input.candidates = [];
    input.groups[0]!.group.candidateIds = [];
    expect(foldReviewVerdict(input).verdict).toBe('APPROVED');
  });

  it('does not let a reasoned reviewer skip remove assigned review work', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.review!.files[0]!.result = 'skipped';
    input.groups[0]!.review!.files[0]!.reason = 'Need a runtime fixture';
    const result = foldReviewVerdict(input);
    expect(result.verdict).toBe('REQUEST_CHANGES');
    expect(result.reviewComplete).toBe(false);
    expect(result.checklist[0]).toMatchObject({
      result: 'pending',
      reason: 'reviewer skipped: Need a runtime fixture',
    });
    expect(result.filesSkipped).toBe(1);
  });

  it('counts a partially reviewed chunked path once and preserves its obligation', () => {
    const input = createVerdictFoldFixture();
    const group = input.groups[0]!;
    const unit = group.group.units[0]!;
    group.group.units = [
      { ...unit, chunk: { index: 1, total: 2 } },
      { ...unit, chunk: { index: 2, total: 2 } },
    ];
    group.review!.files[0]!.chunk = '1/2';
    const missing = foldReviewVerdict(input);
    expect(missing.verdict).toBe('REQUEST_CHANGES');
    expect(missing.reviewComplete).toBe(false);
    expect(
      missing.checklist.filter((row) => row.path === unit.path),
    ).toHaveLength(1);
    expect(missing.checklist[0]!.result).toBe('pending');
    group.review!.files.push({ ...group.review!.files[0]!, chunk: '2/2' });
    expect(foldReviewVerdict(input).filesReviewed).toBe(1);
  });

  it('keeps canonical confirmation when every roster path is legitimately excluded', () => {
    const input = createVerdictFoldFixture();
    input.files = input.files.map((file) => ({
      ...file,
      skipReason: 'deleted path',
    }));
    input.groups[0]!.group.units = [];
    input.groups[0]!.review!.files = [];
    const result = foldReviewVerdict(input);
    expect(result.verdict).toBe('REQUEST_CHANGES');
    expect(result.filesReviewed).toBe(0);
    expect(result.filesSkipped).toBe(result.filesTotal);
  });

  it('retains original nonblank reason bytes and does not mutate the roster', () => {
    const input = createVerdictFoldFixture();
    input.files = [
      { ...input.files[0]!, skipReason: '  generated artifact  ' },
    ];
    const before = JSON.stringify(input);
    expect(foldReviewVerdict(input).checklist[0]!.reason).toBe(
      '  generated artifact  ',
    );
    expect(JSON.stringify(input)).toBe(before);
  });
});
