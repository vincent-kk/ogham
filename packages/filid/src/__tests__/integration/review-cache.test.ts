/**
 * Integration test: Review Cache Lifecycle
 * Tests content hash computation and cache hit/miss across git operations.
 * Uses a real temporary git repository.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewManage } from '../../mcp/tools/review-manage/review-manage.js';

// ─── helpers ────────────────────────────────────────────────────────────────

let tmpDir: string;

function git(args: string): string {
  return execSync(`git ${args}`, { cwd: tmpDir, stdio: 'pipe' })
    .toString()
    .trim();
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'review-cache-test-'));

  // Init repo with initial commit on main
  git('init -b main');
  git('config user.email "test@test.com"');
  git('config user.name "Test"');
  await fs.mkdir(path.join(tmpDir, 'src', 'core'), { recursive: true });
  writeFileSync(path.join(tmpDir, 'src', 'core', 'index.ts'), 'export {};');
  writeFileSync(
    path.join(tmpDir, 'src', 'core', 'utils.ts'),
    'export const x = 1;',
  );
  git('add .');
  git('commit -m "initial"');

  // Create feature branch with changes
  git('checkout -b feature/cache-lifecycle');
  writeFileSync(
    path.join(tmpDir, 'src', 'core', 'utils.ts'),
    'export const x = 42;',
  );
  writeFileSync(
    path.join(tmpDir, 'src', 'core', 'helper.ts'),
    'export const h = true;',
  );
  git('add .');
  git('commit -m "feature changes"');
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ─── lifecycle tests ────────────────────────────────────────────────────────

describe('review cache lifecycle', () => {
  it('cache miss on first run (no content-hash.json)', async () => {
    const result = await handleReviewManage({
      action: 'check-cache',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });

    expect(result.cacheHit).toBe(false);
    expect(result.action).toBe('proceed-full-review');
  });

  it('content-hash creates hash file and check-cache finds it', async () => {
    // Compute and persist content hash
    const hashResult = await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });
    expect(hashResult.sessionHash).toBeDefined();

    // Without review-report.md → still a miss (incomplete review)
    const cacheResult = await handleReviewManage({
      action: 'check-cache',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });
    expect(cacheResult.cacheHit).toBe(false);
    expect(cacheResult.action).toBe('proceed-full-review');
  });

  it('cache hit after completed review', async () => {
    // Compute hash
    await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });

    // Simulate completed review
    const reviewDir = path.join(
      tmpDir,
      '.filid',
      'review',
      'feature--cache-lifecycle',
    );
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), '# Report');

    // Now check cache → hit
    const result = await handleReviewManage({
      action: 'check-cache',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });
    expect(result.cacheHit).toBe(true);
    expect(result.action).toBe('skip-to-existing-results');
    expect(result.existingReportPath).toContain('review-report.md');
  });

  it('cache miss after file modification', async () => {
    // Create hash + report
    await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });
    const reviewDir = path.join(
      tmpDir,
      '.filid',
      'review',
      'feature--cache-lifecycle',
    );
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), '# Report');

    // Modify a file and commit
    writeFileSync(
      path.join(tmpDir, 'src', 'core', 'utils.ts'),
      'export const x = 999;',
    );
    git('add .');
    git('commit -m "another change"');

    // Check cache → miss (content changed)
    const result = await handleReviewManage({
      action: 'check-cache',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });
    expect(result.cacheHit).toBe(false);
    expect(result.action).toBe('proceed-full-review');
  });

  it('same hash after git commit --amend (rebase-proof)', async () => {
    // Compute initial hash
    const hash1 = await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });

    // Amend commit (same content, different commit SHA)
    git('commit --amend --no-edit');

    // Compute hash again
    const hash2 = await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });

    // Same content → same hash (rebase-proof)
    expect(hash2.sessionHash).toBe(hash1.sessionHash);
  });

  it('DELETED sentinel for deleted files', async () => {
    // Delete utils.ts (existed in main, modified in feature → now deleted)
    git('rm src/core/utils.ts');
    git('commit -m "delete utils"');

    const result = await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-lifecycle',
      baseRef: 'main',
    });

    const hashes = result.fileHashes as Record<string, string>;
    // utils.ts existed in main, deleted in HEAD → shows in diff as DELETED
    expect(hashes['src/core/utils.ts']).toBe('DELETED');
    // helper.ts was added then still exists → has a blob hash
    expect(hashes['src/core/helper.ts']).toMatch(/^[0-9a-f]{40}$/);
  });
});
