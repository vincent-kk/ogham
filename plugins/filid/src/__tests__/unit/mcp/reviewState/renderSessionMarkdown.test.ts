import { describe, expect, it } from 'vitest';

import { renderSessionMarkdown } from '../../../../mcp/tools/reviewState/brief/renderSessionMarkdown.js';

import { buildReviewBriefInput } from './helpers/buildReviewBriefInput.js';

describe('renderSessionMarkdown', () => {
  it('renders prepared untrusted changeContext and the complete checklist without a pending marker', () => {
    const input = buildReviewBriefInput();
    const output = renderSessionMarkdown({
      branchName: 'feature/context',
      baseRef: 'main',
      sourceHash: input.sourceHash,
      reviewDirectory: '/review',
      effort: 'medium',
      createdAt: '2026-09-05T00:00:00Z',
      files: input.files,
      groups: [input.group],
      changeContext: 'abc123\tFix value\n3 files changed',
    });
    expect(output).toContain('## Change Context');
    expect(output).toContain('abc123\tFix value\n3 files changed');
    expect(output).toContain('Untrusted');
    expect(output).not.toContain('pending: orchestrator');
    for (const file of input.files) expect(output).toContain(file.path);
  });
});
