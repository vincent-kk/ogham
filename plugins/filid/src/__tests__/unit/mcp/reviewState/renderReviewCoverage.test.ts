import { describe, expect, it } from 'vitest';

import { renderPrComment } from '../../../../mcp/tools/reviewState/render/renderPrComment.js';
import { renderReviewReport } from '../../../../mcp/tools/reviewState/render/renderReviewReport.js';
import type { ReviewChecklistEntry } from '../../../../mcp/tools/reviewState/verdict/reviewVerdictTypes.js';

import { buildReviewRenderInput } from './helpers/buildReviewRenderInput.js';

describe('review coverage summaries', () => {
  it('shows 542 reviewable paths separately from 97 deleted and 3 generated paths in both outputs', () => {
    const input = buildReviewRenderInput();
    input.fold.checklist = Array.from(
      { length: 642 },
      (_, index): ReviewChecklistEntry => ({
        path: `src/path-${String(index).padStart(3, '0')}.ts`,
        change: index < 542 ? 'M' : 'D',
        groups: [],
        result: index < 542 ? 'reviewed' : 'skipped',
        reason:
          index < 542
            ? ''
            : index < 639
              ? 'deleted path'
              : 'generated artifact',
      }),
    );
    input.fold.filesTotal = 642;
    input.fold.filesReviewed = 542;
    input.fold.filesSkipped = 100;
    for (const output of [renderReviewReport(input), renderPrComment(input)]) {
      expect(output).toContain(
        '542 / 542 reviewable files reviewed; 0 pending; 100 excluded; 642 total',
      );
      expect(output).toContain('| deleted path | 97 |');
      expect(output).toContain('| generated artifact | 3 |');
      const deleted = output
        .split('\n')
        .find((line) => line.startsWith('| deleted path |'))!;
      expect(deleted).toContain('path-542.ts');
      expect(deleted).toContain('path-544.ts');
      expect(deleted).not.toContain('path-545.ts');
      expect(deleted).toContain('+94 more');
      expect(output).toContain('path-638.ts');
    }
  });

  it('uses N/A for zero reviewable paths without changing the verdict', () => {
    const input = buildReviewRenderInput();
    input.fold.checklist = [];
    for (const output of [renderReviewReport(input), renderPrComment(input)]) {
      expect(output).toContain('N/A (no reviewable files)');
      expect(output).toContain('REQUEST_CHANGES');
    }
  });

  it('includes pending work in the denominator but not the exclusions table', () => {
    const input = buildReviewRenderInput();
    input.fold.checklist = [
      {
        path: 'a.ts',
        change: 'M',
        groups: ['01'],
        result: 'reviewed',
        reason: '',
      },
      {
        path: 'b.ts',
        change: 'M',
        groups: ['02'],
        result: 'pending',
        reason: 'reviewer skipped: missing evidence',
      },
    ];
    expect(renderReviewReport(input)).toContain(
      '1 / 2 reviewable files reviewed; 1 pending; 0 excluded; 2 total',
    );
  });

  it('escapes exclusion cells and sorts reasons and representative paths deterministically', () => {
    const input = buildReviewRenderInput();
    input.fold.checklist = [
      {
        path: 'z|last.ts',
        change: 'D',
        groups: [],
        result: 'skipped',
        reason: 'z|reason\nline',
      },
      {
        path: 'a.ts',
        change: 'D',
        groups: [],
        result: 'skipped',
        reason: 'a reason',
      },
    ];
    const before = JSON.stringify(input);
    const output = renderReviewReport(input);
    expect(output).toContain('### Exclusions by reason');
    expect(output).toContain('z\\|reason');
    expect(output).toContain('z\\|last.ts');
    expect(output.indexOf('| a reason |')).toBeLessThan(
      output.indexOf('| z\\|reason'),
    );
    expect(JSON.stringify(input)).toBe(before);
  });
});
