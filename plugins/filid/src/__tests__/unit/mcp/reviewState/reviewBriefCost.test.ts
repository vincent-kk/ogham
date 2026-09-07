import { describe, expect, it } from 'vitest';

import { renderOpinionSkeleton } from '../../../../mcp/tools/reviewState/brief/renderOpinionSkeleton.js';
import { renderReviewBrief } from '../../../../mcp/tools/reviewState/brief/renderReviewBrief.js';

import { buildLargeReviewBriefInputs } from './helpers/buildLargeReviewBriefInputs.js';

describe('review brief cost and skeleton contract', () => {
  it('uses the assigned skeleton without repeating the complete opinion object', () => {
    const input = buildLargeReviewBriefInputs()[0]!;
    const brief = renderReviewBrief(input);
    const contract = brief.split('## Output Contract\n')[1]!;
    expect(contract).toContain('prewritten');
    expect(contract).not.toContain('```json');
    expect(Buffer.byteLength(contract)).toBeLessThan(1700);
    expect(brief).toContain(input.reviewerMethod);
    for (const rule of input.rules)
      expect(brief).toContain(rule.body.trimEnd());
    const skeleton = JSON.parse(
      renderOpinionSkeleton(input.group, input.sourceHash),
    );
    expect(Object.keys(skeleton)).toEqual([
      'schema',
      'group',
      'round',
      'state',
      'sourceHash',
      'files',
      'findings',
      'checked',
      'gaps',
      'riskPlan',
    ]);
    expect(skeleton.files).toHaveLength(14);
    expect(skeleton.files.map((file: { path: string }) => file.path)).toEqual(
      input.group.units.map((unit) => unit.path),
    );
  });
  it('keeps the newly required skeleton read compact and parseable', () => {
    const input = buildLargeReviewBriefInputs()[0]!;
    const skeleton = renderOpinionSkeleton(input.group, input.sourceHash);
    console.log(
      `REVIEW_SKELETON_BASELINE_BYTES=${Buffer.byteLength(skeleton)}`,
    );
    expect(skeleton).toBe(`${JSON.stringify(JSON.parse(skeleton))}\n`);
  });
});
