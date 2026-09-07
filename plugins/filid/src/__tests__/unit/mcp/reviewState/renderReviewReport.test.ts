import { describe, expect, it } from 'vitest';

import { renderReviewReport } from '../../../../mcp/tools/reviewState/render/renderReviewReport.js';

import { buildReviewRenderInput } from './helpers/buildReviewRenderInput.js';

/** Ordered report headings required by the schema-7 artifact contract. */
const REPORT_HEADINGS = [
  '## Scope',
  '## Evidence Status',
  '## Coverage',
  '## Verification Log',
  '## Confirmed Findings',
  '## Refuted Candidates',
  '## Unresolved Evidence',
  '## Final Verdict',
];

/**
 * Read one second-level Markdown section without including the next section.
 *
 * @param markdown Complete rendered report text.
 * @param heading Exact second-level heading to locate.
 * @returns Content owned by the requested section.
 */
function readSection(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  const tail = markdown.slice(start + heading.length);
  const end = tail.search(/\n## /);
  return end < 0 ? tail : tail.slice(0, end);
}

describe('renderReviewReport', () => {
  it('renders exact schema-7 frontmatter, section order, scope, and evidence', () => {
    const input = buildReviewRenderInput();
    const output = renderReviewReport(input);
    const frontmatter = output.split('---')[1]?.trim().split('\n');

    expect(frontmatter).toEqual([
      'review_schema: 7',
      'verdict: REQUEST_CHANGES',
      'branch: feature/render-v7',
      'base_ref: main',
      'source_hash: source-hash-v7',
      'snapshot_hash: snapshot-hash-v7',
      'files_total: 3',
      'files_reviewed: 1',
      'files_skipped: 1',
      'generated_at: 2026-09-04T12:34:56.000Z',
    ]);
    expect(output.match(/^## .+$/gm)).toEqual(REPORT_HEADINGS);
    expect(readSection(output, '## Scope')).toContain('| src/a.ts | src |');
    expect(readSection(output, '## Evidence Status')).toContain(
      '| evidence_complete | true |',
    );
    expect(readSection(output, '## Evidence Status')).toContain(
      '| verification_status | violations |',
    );
  });

  it('renders every confirmed finding path with its resolved lines', () => {
    const output = renderReviewReport(buildReviewRenderInput());
    const confirmed = readSection(output, '## Confirmed Findings');

    expect(confirmed).toContain('| src/a.ts:12-14 |');
    expect(confirmed).toContain('| src/z.ts:unknown |');
  });

  it('routes gaps, observations, indeterminate decisions, and unavailable artifacts only to unresolved evidence', () => {
    const output = renderReviewReport(buildReviewRenderInput());
    const confirmed = readSection(output, '## Confirmed Findings');
    const unresolved = readSection(output, '## Unresolved Evidence');

    expect(unresolved).toContain('required runtime evidence was unavailable');
    expect(unresolved).toContain('optional adapter');
    expect(unresolved).toContain('artifact not validated');
    expect(unresolved).toContain('missing decision');
    expect(unresolved).toContain('src/c.ts');
    expect(confirmed).not.toContain(
      'required runtime evidence was unavailable',
    );
    expect(confirmed).not.toContain('optional adapter');
    expect(confirmed).not.toContain('artifact not validated');
    expect(confirmed).not.toContain('missing decision');
    expect(confirmed).not.toContain('src/c.ts');
  });
});
