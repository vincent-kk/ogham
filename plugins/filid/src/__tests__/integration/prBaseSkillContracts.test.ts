/** Canonical skill instructions are the executable wiring for PR metadata. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/** Loader input for PR base selection and publication. */
const pullRequest = readFileSync(
  fileURLToPath(
    new URL('../../../skills/pull-request/SKILL.md', import.meta.url),
  ),
  'utf8',
);
/** Loader input for selecting the committed review range. */
const crossReview = readFileSync(
  fileURLToPath(
    new URL('../../../skills/cross-review/SKILL.md', import.meta.url),
  ),
  'utf8',
);

describe('PR base skill wiring regressions', () => {
  it('resolves the base before prerequisites and document scope consume it', () => {
    const resolve = pullRequest.indexOf('scripts/resolveBaseBranch.mjs');
    const noCommits = pullRequest.indexOf('at least one commit');
    expect(resolve).toBeGreaterThanOrEqual(0);
    expect(noCommits).toBeGreaterThan(resolve);
    expect(resolve).toBeLessThan(pullRequest.indexOf('## Stage 1'));
    expect(pullRequest).toContain('baseRef: BASE_REF');
    expect(pullRequest).toContain('baseBranch` as `BASE_BRANCH');
  });

  it('uses the selected base for branch-only commits, diff statistics and PR writes', () => {
    expect(pullRequest).toContain('git log --format=%s <BASE_REF>..HEAD');
    expect(pullRequest).toContain('git diff --stat <BASE_REF>...HEAD');
    const publication = pullRequest.split('## Stage 4 — PR Publication')[1];
    expect(publication).toContain('gh pr create --base <BASE_BRANCH>');
    expect(publication).toContain('gh pr edit --base <BASE_BRANCH>');
  });

  it('reads PR base metadata in the existing single lookup', () => {
    expect(crossReview).toContain(
      'gh pr view --json number,url,body,baseRefName',
    );
    expect(crossReview).toContain('baseRefName` as `PR_BASE_BRANCH');
    expect(crossReview).toContain('missing or empty');
  });

  it('passes explicit then PR then automatic base selection to prepare', () => {
    expect(crossReview).toContain(
      '`--base` → `refs/remotes/origin/<PR_BASE_BRANCH>` → omit',
    );
    expect(crossReview).toContain('baseRef?: PREPARE_BASE_REF');
    expect(crossReview).toContain('never fall back');
    expect(crossReview).not.toContain('baseRef?: --base');
  });
});
