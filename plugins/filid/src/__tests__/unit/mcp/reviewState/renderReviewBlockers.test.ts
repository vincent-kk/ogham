import { describe, expect, it } from 'vitest';

import { renderPrComment } from '../../../../mcp/tools/reviewState/render/renderPrComment.js';
import { renderReviewBlockers } from '../../../../mcp/tools/reviewState/render/renderReviewBlockers.js';
import { renderReviewReport } from '../../../../mcp/tools/reviewState/render/renderReviewReport.js';

import { buildBlockerRenderInput } from './helpers/buildBlockerRenderInput.js';

describe('separate review blockers report', () => {
  it('keeps every question and resolution in a separate identity-bound report', () => {
    const input = buildBlockerRenderInput();
    const before = JSON.stringify(input);
    const output = renderReviewBlockers(input)!;
    expect(output).toContain('blockers_schema: 1');
    expect(output).toContain('source_hash: "source-hash"');
    expect(output).toContain('verdict: REQUEST_CHANGES');
    for (const blocker of input.fold.blockers) {
      expect(output).toContain(`### ${blocker.id}\n`);
      expect(output).toContain(blocker.resolution.question);
      expect(output).toContain(blocker.resolution.nextAction);
      expect(output).toContain(blocker.resolution.doneWhen);
    }
    expect(output.match(/\]\(#blk-\d+\)/g)).toHaveLength(5);
    expect(output).toContain('review-report.md');
    expect(output).not.toContain('## Confirmed Findings');
    expect(output).not.toContain('| Path | Change |');
    expect(JSON.stringify(input)).toBe(before);
  });

  it('separates human decisions, triage, and evidence recovery in attention order', () => {
    const output = renderReviewBlockers(buildBlockerRenderInput())!;
    expect(output.indexOf('## Human decision requests')).toBeLessThan(
      output.indexOf('## Needs triage'),
    );
    expect(output.indexOf('## Needs triage')).toBeLessThan(
      output.indexOf('## Evidence recovery'),
    );
    expect(output).toContain('not assignments or permission');
    expect(output).toContain('**Evidence needed**');
    expect(output).toContain('**Completion condition**');
    expect(output).toContain('**Sources**');
  });

  it('places the same bounded action list before bulk report and PR details', () => {
    const input = buildBlockerRenderInput();
    const report = renderReviewReport(input);
    const comment = renderPrComment(input);
    const reportSummary = report.slice(
      report.indexOf('## Review blockers'),
      report.indexOf('## Scope'),
    );
    const commentSummary = comment.slice(
      comment.indexOf('### Review blockers'),
      comment.indexOf('<details>'),
    );
    expect(reportSummary).toContain('4 more');
    expect(commentSummary).toContain('4 more');
    const reportIds = [...reportSummary.matchAll(/\bBLK-\d+\b/g)].map(
      ([id]) => id,
    );
    const commentIds = [...commentSummary.matchAll(/\bBLK-\d+\b/g)].map(
      ([id]) => id,
    );
    expect(reportIds).toHaveLength(5);
    expect(commentIds).toEqual(reportIds);
    expect(report).toContain('blockers_report: review-blockers.md');
    expect(comment).toContain('local artifact');
    expect(comment).not.toContain('](review-blockers.md');
    expect(comment.match(/<details>/g)).toHaveLength(3);
  });

  it('preserves full resolution text and escapes actor Markdown, HTML, and URLs', () => {
    const input = buildBlockerRenderInput(1);
    const blocker = input.fold.blockers.find(
      (item) => item.kind === 'review-gap',
    )!;
    blocker.detail =
      '<script>alert(1)</script> [click](https://example.invalid)';
    blocker.resolution.question = 'Question | with a pipe';
    blocker.resolution.nextAction =
      '![image](https://example.invalid/image) and **bold**';
    const output = renderReviewBlockers(input)!;
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('[click](https://');
    expect(output).not.toContain('![image](');
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('Question \\| with a pipe');
    expect(output).toContain('https&#58;//');
  });

  it('keeps all cards for large blocker sets while limiting only the top-level summary', () => {
    const input = buildBlockerRenderInput(80);
    const output = renderReviewBlockers(input)!;
    expect(output.match(/^### BLK-\d+$/gm)).toHaveLength(81);
    expect(renderPrComment(input)).toContain('76 more');
  });

  it('does not generate a blocker report or marker for conclusive verdicts', () => {
    const input = buildBlockerRenderInput(0);
    input.fold.verdict = 'APPROVED';
    input.fold.blockers = [];
    expect(renderReviewBlockers(input)).toBeNull();
    expect(renderReviewReport(input)).not.toContain('blockers_report:');
    expect(renderPrComment(input)).not.toContain('Review blockers');
  });

  it('preserves conflicting advice as alternatives rather than choosing an owner', () => {
    const input = buildBlockerRenderInput(1);
    const blocker = input.fold.blockers[1]!;
    blocker.attention = 'triage';
    blocker.adviceSource = 'conflict';
    blocker.alternativeResolutions = [
      blocker.resolution,
      {
        ...blocker.resolution,
        question: 'Could a fixture answer this first?',
        suggestedOwner: 'agent',
      },
    ];
    const output = renderReviewBlockers(input)!;
    expect(output).toContain('Conflicting proposals');
    expect(output).toContain('Could a fixture answer this first?');
  });
});
