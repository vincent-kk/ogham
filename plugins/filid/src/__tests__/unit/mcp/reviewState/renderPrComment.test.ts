import { describe, expect, it } from 'vitest';

import { renderChecklistBlock } from '../../../../mcp/tools/reviewState/render/renderChecklistBlock.js';
import { renderPrComment } from '../../../../mcp/tools/reviewState/render/renderPrComment.js';

import { buildReviewRenderInput } from './helpers/buildReviewRenderInput.js';

/** Session fixture with user-written context and a stale checklist block. */
const SESSION_WITH_STALE_CHECKLIST = `---
review_schema: 7
branch: feature/render-v7
---

## Change Context

User-written summary that must survive unchanged.

## Review Checklist

| Path | Change | Group | Result | Reason |
| --- | --- | --- | --- | --- |
| stale.ts | M | 99 | reviewed | stale row |
`;

describe('renderPrComment', () => {
  it('renders the governance table, exactly three details blocks, and report pointer', () => {
    const output = renderPrComment(buildReviewRenderInput());

    expect(output).toContain('## Code Review Governance — REQUEST_CHANGES');
    expect(output).toContain('| Verdict | REQUEST_CHANGES |');
    expect(output).toContain('| Branch | `feature/render-v7` |');
    expect(output).toContain('| Base | `main` |');
    expect(output).toContain('| Snapshot | `snapshot-hash-v7` |');
    expect(output).toContain('| Coverage | 1 reviewed · 1 skipped · 3 total |');
    expect(output).toContain(
      '| Findings | 2 confirmed · 1 refuted · 1 indeterminate |',
    );
    expect(output).toContain('| Generated | 2026-09-04T12:34:56.000Z |');
    expect(output.match(/<details>/g)).toHaveLength(3);
    expect(output.match(/<\/details>/g)).toHaveLength(3);
    expect(output).toContain(
      '> Full report: `.metadata/filid/reviews/feature-render-v7/review-report.md`',
    );
  });

  it('keeps the empty confirmed block and replaces the complete session checklist', () => {
    const input = buildReviewRenderInput();
    const comment = renderPrComment({
      ...input,
      fold: {
        ...input.fold,
        verdict: 'APPROVED',
        decisions: [],
        confirmed: [],
        refuted: [],
        indeterminate: [],
        unresolved: [],
      },
    });
    const session = renderChecklistBlock(
      SESSION_WITH_STALE_CHECKLIST,
      input.fold.checklist,
    );

    expect(comment).toContain(
      '<details><summary>Confirmed findings (0)</summary>\n\nNone\n\n</details>',
    );
    expect(comment.match(/<details>/g)).toHaveLength(3);
    expect(session).toContain(
      'User-written summary that must survive unchanged.',
    );
    expect(session).not.toContain('stale.ts');
    expect(session).toContain('| src/a.ts | M | 01 | reviewed |  |');
    expect(session).toContain(
      '| public/generated.js | M |  | skipped | generated path |',
    );
    expect(() =>
      renderChecklistBlock('## Change Context\n\nNo checklist here.\n', []),
    ).toThrow(/Review Checklist/);
  });
});
