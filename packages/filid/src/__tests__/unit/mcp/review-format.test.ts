import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  formatPrComment,
  formatRevalidateComment,
} from '../../../mcp/tools/review-format.js';

// ─── helpers ────────────────────────────────────────────────────────────────

async function makeTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'review-format-test-'));
}

async function setupReviewDir(tmpDir: string, branch: string): Promise<string> {
  const normalized = branch.replace(/\//g, '--');
  const reviewDir = path.join(tmpDir, '.filid', 'review', normalized);
  await fs.mkdir(reviewDir, { recursive: true });
  return reviewDir;
}

const SAMPLE_REPORT = `# Code Review Report — feature/test

**Date**: 2026-03-08T00:00:00Z
**Scope**: branch
**Base**: main
**Verdict**: REQUEST_CHANGES

## Committee Composition

| Persona | Election Basis | Final Position |
| --- | --- | --- |
| Engineering Architect | LCOM4 check | SYNTHESIS |

## Deliberation Log

### Round 1 — PROPOSAL

The committee discussed the changes.

### Round 2 — CONCLUSION

All members reached consensus.

## Final Verdict

**REQUEST_CHANGES** — 2 fix request items generated.
`;

const SAMPLE_STRUCTURE = `---
scope: diff
overall: FAIL
critical_count: 1
---

# Structure Check

| Stage | Name | Result | Issues |
| --- | --- | --- | --- |
| 1 | Structure | PASS | 0 |
| 3 | Tests | FAIL | 1 |
`;

const SAMPLE_FIX_REQUESTS = `# Fix Requests — feature/test

**Generated**: 2026-03-08T00:00:00Z
**Total Items**: 2

## FIX-001: High CC in computePageRank

- **Severity**: HIGH
- **Path**: \`src/graph/page-rank.ts\`
`;

const SAMPLE_REVALIDATE_PASS = `# Re-validation Report — feature/test

**Date**: 2026-03-08T00:00:00Z
**Verdict**: PASS

## Fix Verification

| Fix | Status |
| --- | --- |
| FIX-001 | RESOLVED |

All fixes resolved or validly deferred.
`;

const SAMPLE_REVALIDATE_FAIL = `# Re-validation Report — FAIL

**Date**: 2026-03-08T00:00:00Z
**Verdict**: FAIL

## Fix Verification

| Fix | Status |
| --- | --- |
| FIX-001 | UNRESOLVED |

Action required: address unresolved items.
`;

// ─── formatPrComment ────────────────────────────────────────────────────────

describe('formatPrComment', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmp();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns markdown with 3 <details> sections when all files present', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), SAMPLE_REPORT);
    await fs.writeFile(
      path.join(reviewDir, 'structure-check.md'),
      SAMPLE_STRUCTURE,
    );
    await fs.writeFile(
      path.join(reviewDir, 'fix-requests.md'),
      SAMPLE_FIX_REQUESTS,
    );

    const result = await formatPrComment({
      action: 'format-pr-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    const md = result.markdown as string;
    expect(md).toContain('## Code Review Governance — REQUEST_CHANGES');
    expect(md).toContain(
      '<details><summary>Phase A — Structure Compliance</summary>',
    );
    expect(md).toContain(
      '<details><summary>Review Report (Phase B~D)</summary>',
    );
    expect(md).toContain('<details><summary>Fix Requests</summary>');
    // Count <details> tags
    const detailsCount = (md.match(/<details>/g) || []).length;
    expect(detailsCount).toBe(3);
    expect(result.verdict).toBe('REQUEST_CHANGES');
  });

  it('returns markdown with 1 <details> section when only review-report.md exists', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), SAMPLE_REPORT);

    const result = await formatPrComment({
      action: 'format-pr-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    const md = result.markdown as string;
    expect(md).toContain(
      '<details><summary>Review Report (Phase B~D)</summary>',
    );
    expect(md).not.toContain('Phase A');
    expect(md).not.toContain('Fix Requests');
    const detailsCount = (md.match(/<details>/g) || []).length;
    expect(detailsCount).toBe(1);
  });

  it('throws when review-report.md is missing', async () => {
    await setupReviewDir(tmpDir, 'feature/test');

    await expect(
      formatPrComment({
        action: 'format-pr-comment',
        projectRoot: tmpDir,
        branchName: 'feature/test',
      }),
    ).rejects.toThrow('review-report.md not found');
  });

  it('extracts APPROVED verdict correctly', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    const approvedReport = SAMPLE_REPORT.replace('REQUEST_CHANGES', 'APPROVED');
    await fs.writeFile(
      path.join(reviewDir, 'review-report.md'),
      approvedReport,
    );

    const result = await formatPrComment({
      action: 'format-pr-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    expect(result.verdict).toBe('APPROVED');
    expect(result.markdown as string).toContain(
      '## Code Review Governance — APPROVED',
    );
  });

  it('extracts INCONCLUSIVE verdict correctly', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    const inconclusiveReport = SAMPLE_REPORT.replace(
      'REQUEST_CHANGES',
      'INCONCLUSIVE',
    );
    await fs.writeFile(
      path.join(reviewDir, 'review-report.md'),
      inconclusiveReport,
    );

    const result = await formatPrComment({
      action: 'format-pr-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    expect(result.verdict).toBe('INCONCLUSIVE');
  });

  it('applies size guard when content exceeds 50000 chars', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    const hugeReport = SAMPLE_REPORT + '\n' + 'x'.repeat(60_000);
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), hugeReport);

    const result = await formatPrComment({
      action: 'format-pr-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    const md = result.markdown as string;
    expect(md.length).toBeLessThan(50_000);
    expect(md).toContain('exceeds GitHub comment size limit');
    expect(md).not.toContain('<details>');
  });

  it('throws when branchName is missing', async () => {
    await expect(
      formatPrComment({
        action: 'format-pr-comment',
        projectRoot: tmpDir,
      }),
    ).rejects.toThrow('branchName');
  });

  it('includes all <details> tags properly closed', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), SAMPLE_REPORT);
    await fs.writeFile(
      path.join(reviewDir, 'structure-check.md'),
      SAMPLE_STRUCTURE,
    );
    await fs.writeFile(
      path.join(reviewDir, 'fix-requests.md'),
      SAMPLE_FIX_REQUESTS,
    );

    const result = await formatPrComment({
      action: 'format-pr-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    const md = result.markdown as string;
    const openCount = (md.match(/<details>/g) || []).length;
    const closeCount = (md.match(/<\/details>/g) || []).length;
    expect(openCount).toBe(closeCount);
  });
});

// ─── formatRevalidateComment ────────────────────────────────────────────────

describe('formatRevalidateComment', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmp();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns markdown with <details> section for PASS verdict', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    await fs.writeFile(
      path.join(reviewDir, 're-validate.md'),
      SAMPLE_REVALIDATE_PASS,
    );

    const result = await formatRevalidateComment({
      action: 'format-revalidate-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    const md = result.markdown as string;
    expect(md).toContain('Re-validation');
    expect(md).toContain('PASS');
    expect(md).toContain('<details><summary>Re-validation Details</summary>');
    expect(result.verdict).toBe('PASS');
  });

  it('returns FAIL verdict correctly', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    await fs.writeFile(
      path.join(reviewDir, 're-validate.md'),
      SAMPLE_REVALIDATE_FAIL,
    );

    const result = await formatRevalidateComment({
      action: 'format-revalidate-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    expect(result.verdict).toBe('FAIL');
    expect(result.markdown as string).toContain('FAIL');
  });

  it('throws when re-validate.md is missing', async () => {
    await setupReviewDir(tmpDir, 'feature/test');

    await expect(
      formatRevalidateComment({
        action: 'format-revalidate-comment',
        projectRoot: tmpDir,
        branchName: 'feature/test',
      }),
    ).rejects.toThrow('re-validate.md not found');
  });

  it('throws when branchName is missing', async () => {
    await expect(
      formatRevalidateComment({
        action: 'format-revalidate-comment',
        projectRoot: tmpDir,
      }),
    ).rejects.toThrow('branchName');
  });

  it('applies size guard for oversized content', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    const hugeContent = SAMPLE_REVALIDATE_PASS + '\n' + 'y'.repeat(60_000);
    await fs.writeFile(path.join(reviewDir, 're-validate.md'), hugeContent);

    const result = await formatRevalidateComment({
      action: 'format-revalidate-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    const md = result.markdown as string;
    expect(md.length).toBeLessThan(50_000);
    expect(md).toContain('exceeds GitHub comment size limit');
  });

  it('has properly closed <details> tags', async () => {
    const reviewDir = await setupReviewDir(tmpDir, 'feature/test');
    await fs.writeFile(
      path.join(reviewDir, 're-validate.md'),
      SAMPLE_REVALIDATE_PASS,
    );

    const result = await formatRevalidateComment({
      action: 'format-revalidate-comment',
      projectRoot: tmpDir,
      branchName: 'feature/test',
    });

    const md = result.markdown as string;
    const openCount = (md.match(/<details>/g) || []).length;
    const closeCount = (md.match(/<\/details>/g) || []).length;
    expect(openCount).toBe(closeCount);
    expect(openCount).toBeGreaterThan(0);
  });
});
