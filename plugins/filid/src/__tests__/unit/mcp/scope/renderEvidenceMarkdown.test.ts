import { describe, expect, it } from 'vitest';

import { renderEvidenceMarkdown } from '../../../../mcp/tools/reviewState/scope/renderEvidenceMarkdown.js';

const EMPTY_MODEL = {
  sourceHash: 'source-hash',
  snapshotHash: 'snapshot-hash',
  evidenceComplete: true,
  structure: 'ok',
  verification: 'violations',
  worktree: 'clean',
  createdAt: '2026-09-04T00:00:00.000Z',
  files: [],
  candidates: [],
  informational: [],
  outOfScope: [],
  diagnostics: [],
} as const;

describe('renderEvidenceMarkdown', () => {
  it('renders the eight canonical frontmatter keys', () => {
    const output = renderEvidenceMarkdown(EMPTY_MODEL);
    const frontmatter = output.split('---')[1]?.trim().split('\n');

    expect(frontmatter?.map((line) => line.split(':')[0])).toEqual([
      'review_schema',
      'source_hash',
      'snapshot_hash',
      'evidence_complete',
      'structure_status',
      'verification_status',
      'worktree',
      'created_at',
    ]);
  });

  it('renders all five evidence section headings', () => {
    const output = renderEvidenceMarkdown(EMPTY_MODEL);

    expect(output.match(/^## /gm)).toEqual(['## ', '## ', '## ', '## ', '## ']);
    expect(output).toContain('## Changed Scope');
    expect(output).toContain('## Candidates');
    expect(output).toContain('## Informational');
    expect(output).toContain('## Out-of-scope Observations');
    expect(output).toContain('## Diagnostics');
  });

  it('uses table headers for empty core tables and none for empty observations', () => {
    const output = renderEvidenceMarkdown(EMPTY_MODEL);

    expect(output).toContain('| Path | Change | Role | Owner | Churn |');
    expect(output).toContain(
      '| ID | Category | Severity | Path | Rule | Message |',
    );
    expect(output.match(/^none$/gm)).toHaveLength(3);
  });

  it('summarizes out-of-scope rows by source, rule, and severity', () => {
    const output = renderEvidenceMarkdown({
      ...EMPTY_MODEL,
      outOfScope: [
        {
          source: 'verification',
          severity: 'warning',
          path: 'tests/z.test.ts',
          ruleId: 'verification-rule',
          message: 'second verification row',
        },
        {
          source: 'structure',
          severity: 'error',
          path: 'src/z.ts',
          ruleId: 'structure-rule',
          message: 'first structure row',
        },
        {
          source: 'structure',
          severity: 'error',
          path: 'src/a.ts',
          ruleId: 'structure-rule',
          message: 'second structure row',
        },
      ] as const,
    });

    expect(output).toContain('| Source | Rule | Severity | Count |');
    expect(output).toContain('| structure | `structure-rule` | error | 2 |');
    expect(output).toContain(
      '| verification | `verification-rule` | warning | 1 |',
    );
    expect(output.indexOf('| structure |')).toBeLessThan(
      output.indexOf('| verification |'),
    );
    expect(output).not.toContain('src/a.ts');
    expect(output).not.toContain('second verification row');
  });
});
