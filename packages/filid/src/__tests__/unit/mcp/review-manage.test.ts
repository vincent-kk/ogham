import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewManage } from '../../../mcp/tools/review-manage/review-manage.js';

// ─── helpers ────────────────────────────────────────────────────────────────

async function makeTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'review-manage-test-'));
}

// ─── normalize-branch ────────────────────────────────────────────────────────

describe('handleReviewManage – normalize-branch', () => {
  it('replaces / with --', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: 'feature/my-feature',
    });
    expect(result).toEqual({ normalized: 'feature--my-feature' });
  });

  it('replaces multiple / separators', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: 'org/team/feature',
    });
    expect(result).toEqual({ normalized: 'org--team--feature' });
  });

  it('replaces special characters with _', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: 'fix#42@user~branch',
    });
    expect(result.normalized as string).toMatch(/fix_42_user_branch/);
  });

  it('removes leading dots', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: '...my-branch',
    });
    expect(result.normalized).toBe('my-branch');
  });

  it('removes trailing dots', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: 'my-branch...',
    });
    expect(result.normalized).toBe('my-branch');
  });

  it('removes leading hyphens', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: '--my-branch',
    });
    expect(result.normalized).toBe('my-branch');
  });

  it('removes trailing hyphens', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: 'my-branch--',
    });
    expect(result.normalized).toBe('my-branch');
  });

  it('preserves consecutive -- in the middle (intentional uniqueness)', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: 'feature/a/b',
    });
    // feature/a/b → feature--a--b (two consecutive -- preserved as-is)
    expect(result.normalized).toBe('feature--a--b');
  });

  it('handles plain branch names without special chars', async () => {
    const result = await handleReviewManage({
      action: 'normalize-branch',
      projectRoot: '/tmp',
      branchName: 'main',
    });
    expect(result.normalized).toBe('main');
  });

  it('throws when branchName is missing', async () => {
    await expect(
      handleReviewManage({ action: 'normalize-branch', projectRoot: '/tmp' }),
    ).rejects.toThrow('branchName');
  });
});

// ─── ensure-dir ──────────────────────────────────────────────────────────────

describe('handleReviewManage – ensure-dir', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmp();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('creates the review directory and returns created=true', async () => {
    const result = await handleReviewManage({
      action: 'ensure-dir',
      projectRoot: tmpDir,
      branchName: 'feature/my-feature',
    });

    expect(result.created).toBe(true);
    const expectedPath = path.join(
      tmpDir,
      '.filid',
      'review',
      'feature--my-feature',
    );
    expect(result.path).toBe(expectedPath);

    const stat = await fs.stat(expectedPath);
    expect(stat.isDirectory()).toBe(true);
  });

  it('is idempotent – returns created=false when directory already exists', async () => {
    const input = {
      action: 'ensure-dir' as const,
      projectRoot: tmpDir,
      branchName: 'feature/my-feature',
    };

    await handleReviewManage(input);
    const result = await handleReviewManage(input);

    expect(result.created).toBe(false);
  });

  it('throws when branchName is missing', async () => {
    await expect(
      handleReviewManage({ action: 'ensure-dir', projectRoot: tmpDir }),
    ).rejects.toThrow('branchName');
  });
});

// ─── checkpoint ──────────────────────────────────────────────────────────────

describe('handleReviewManage – checkpoint', () => {
  let tmpDir: string;
  let reviewDir: string;
  const branch = 'feature/test';
  const normalizedBranch = 'feature--test';

  beforeEach(async () => {
    tmpDir = await makeTmp();
    reviewDir = path.join(tmpDir, '.filid', 'review', normalizedBranch);
    await fs.mkdir(reviewDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns phase A when no files exist', async () => {
    const result = await handleReviewManage({
      action: 'checkpoint',
      projectRoot: tmpDir,
      branchName: branch,
    });
    expect(result.phase).toBe('A');
    expect(result.files).toEqual([]);
  });

  it('returns phase B when only structure-check.md exists', async () => {
    await fs.writeFile(path.join(reviewDir, 'structure-check.md'), '');
    const result = await handleReviewManage({
      action: 'checkpoint',
      projectRoot: tmpDir,
      branchName: branch,
    });
    expect(result.phase).toBe('B');
    expect(result.files).toContain('structure-check.md');
    expect(result.files).not.toContain('session.md');
  });

  it('returns phase A when only session.md exists without no_structure_check flag', async () => {
    await fs.writeFile(path.join(reviewDir, 'session.md'), '');
    const result = await handleReviewManage({
      action: 'checkpoint',
      projectRoot: tmpDir,
      branchName: branch,
    });
    expect(result.phase).toBe('A');
    expect(result.files).toContain('session.md');
    expect(result.files).not.toContain('verification.md');
  });

  it('returns phase C when only session.md exists with no_structure_check: true', async () => {
    await fs.writeFile(
      path.join(reviewDir, 'session.md'),
      'no_structure_check: true\n\n# Session',
    );
    const result = await handleReviewManage({
      action: 'checkpoint',
      projectRoot: tmpDir,
      branchName: branch,
    });
    expect(result.phase).toBe('C');
    expect(result.files).toContain('session.md');
    expect(result.files).not.toContain('verification.md');
  });

  it('returns phase D when session.md and verification.md exist but review-report.md is absent', async () => {
    await fs.writeFile(path.join(reviewDir, 'session.md'), '');
    await fs.writeFile(path.join(reviewDir, 'verification.md'), '');
    const result = await handleReviewManage({
      action: 'checkpoint',
      projectRoot: tmpDir,
      branchName: branch,
    });
    expect(result.phase).toBe('D');
    expect(result.files).toContain('session.md');
    expect(result.files).toContain('verification.md');
    expect(result.files).not.toContain('review-report.md');
  });

  it('reports resume_attempts and resumeExhausted from session.md frontmatter', async () => {
    await fs.writeFile(
      path.join(reviewDir, 'session.md'),
      'resume_attempts: 3\n\n# Session',
    );
    const result = (await handleReviewManage({
      action: 'checkpoint',
      projectRoot: tmpDir,
      branchName: branch,
    })) as { phase: string; resumeAttempts?: number; resumeExhausted?: boolean };
    expect(result.resumeAttempts).toBe(3);
    expect(result.resumeExhausted).toBe(true);
  });

  it('reports resumeExhausted=false when attempts are below MAX_RESUME_RETRIES', async () => {
    await fs.writeFile(
      path.join(reviewDir, 'session.md'),
      'resume_attempts: 1\n\n# Session',
    );
    const result = (await handleReviewManage({
      action: 'checkpoint',
      projectRoot: tmpDir,
      branchName: branch,
    })) as { resumeAttempts?: number; resumeExhausted?: boolean };
    expect(result.resumeAttempts).toBe(1);
    expect(result.resumeExhausted).toBe(false);
  });

  it('returns phase DONE when all three files exist', async () => {
    await fs.writeFile(path.join(reviewDir, 'session.md'), '');
    await fs.writeFile(path.join(reviewDir, 'verification.md'), '');
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), '');
    const result = await handleReviewManage({
      action: 'checkpoint',
      projectRoot: tmpDir,
      branchName: branch,
    });
    expect(result.phase).toBe('DONE');
    expect((result.files as string[]).sort()).toEqual(
      ['session.md', 'verification.md', 'review-report.md'].sort(),
    );
  });

  it('throws when branchName is missing', async () => {
    await expect(
      handleReviewManage({ action: 'checkpoint', projectRoot: tmpDir }),
    ).rejects.toThrow('branchName');
  });
});

// ─── elect-committee ─────────────────────────────────────────────────────────

describe('handleReviewManage – elect-committee', () => {
  it('selects LOW complexity committee for small changes', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 2,
      changedFractalsCount: 1,
      hasInterfaceChanges: false,
    });
    expect(result.complexity).toBe('LOW');
    expect(result.committee).toEqual([
      'engineering-architect',
      'operations-sre',
    ]);
  });

  it('selects MEDIUM complexity when interface changes exist', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 2,
      changedFractalsCount: 1,
      hasInterfaceChanges: true,
    });
    expect(result.complexity).toBe('MEDIUM');
    expect(result.committee).toContain('engineering-architect');
    expect(result.committee).toContain('knowledge-manager');
    expect(result.committee).toContain('business-driver');
    expect(result.committee).toContain('operations-sre');
  });

  it('selects MEDIUM complexity when file count is moderate', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 5,
      changedFractalsCount: 2,
      hasInterfaceChanges: false,
    });
    expect(result.complexity).toBe('MEDIUM');
  });

  it('selects HIGH complexity when changedFilesCount > 10', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 11,
      changedFractalsCount: 2,
      hasInterfaceChanges: false,
    });
    expect(result.complexity).toBe('HIGH');
    expect((result.committee as string[]).length).toBe(6);
  });

  it('selects HIGH complexity when changedFractalsCount >= 4', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 3,
      changedFractalsCount: 4,
      hasInterfaceChanges: false,
    });
    expect(result.complexity).toBe('HIGH');
  });

  it('LOW committee has no adversarial pairs for business-driver (not selected)', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 2,
      changedFractalsCount: 1,
      hasInterfaceChanges: false,
    });
    expect(result.complexity).toBe('LOW');
    // business-driver not in LOW committee, so no adversarial pair for it
    const pairs = result.adversarialPairs as [string, string[]][];
    const businessDriverPair = pairs.find(([p]) => p === 'business-driver');
    expect(businessDriverPair).toBeUndefined();
  });

  it('selects TRIVIAL complexity with adjudicator for minimal changes', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 1,
      changedFractalsCount: 1,
      hasInterfaceChanges: false,
    });
    expect(result.complexity).toBe('TRIVIAL');
    expect(result.committee).toEqual(['adjudicator']);
    expect(result.adversarialPairs).toEqual([]);
  });

  it('selects TRIVIAL complexity when zero files / fractals changed', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 0,
      changedFractalsCount: 0,
      hasInterfaceChanges: false,
    });
    expect(result.complexity).toBe('TRIVIAL');
    expect(result.committee).toEqual(['adjudicator']);
  });

  it('TRIVIAL escalates past interface changes (not TRIVIAL when interface touched)', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 1,
      changedFractalsCount: 1,
      hasInterfaceChanges: true,
    });
    // Interface changes disqualify TRIVIAL / LOW shortcuts.
    expect(result.complexity).toBe('MEDIUM');
    expect(result.committee).not.toContain('adjudicator');
  });

  it('adjudicatorMode short-circuits complexity and returns adjudicator', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 50,
      changedFractalsCount: 10,
      hasInterfaceChanges: true,
      adjudicatorMode: true,
    });
    expect(result.complexity).toBe('TRIVIAL');
    expect(result.committee).toEqual(['adjudicator']);
    expect(result.adversarialPairs).toEqual([]);
  });

  it('adjudicatorMode=false behaves as if absent (normal committee election)', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 5,
      changedFractalsCount: 2,
      hasInterfaceChanges: false,
      adjudicatorMode: false,
    });
    // Not TRIVIAL — should go through normal tier detection → MEDIUM
    expect(result.complexity).toBe('MEDIUM');
    expect(result.committee).not.toContain('adjudicator');
  });

  it('MEDIUM committee includes adversarial pair for business-driver', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 5,
      changedFractalsCount: 2,
      hasInterfaceChanges: false,
    });
    expect(result.complexity).toBe('MEDIUM');
    const pairs = result.adversarialPairs as [string, string[]][];
    const businessDriverPair = pairs.find(([p]) => p === 'business-driver');
    expect(businessDriverPair).toBeDefined();
    expect(businessDriverPair![1]).toContain('knowledge-manager');
    expect(businessDriverPair![1]).toContain('operations-sre');
  });

  it('HIGH committee includes adversarial pairs for product-manager and design-hci', async () => {
    const result = await handleReviewManage({
      action: 'elect-committee',
      projectRoot: '/tmp',
      changedFilesCount: 15,
      changedFractalsCount: 5,
      hasInterfaceChanges: true,
    });
    expect(result.complexity).toBe('HIGH');
    const pairs = result.adversarialPairs as [string, string[]][];

    const pmPair = pairs.find(([p]) => p === 'product-manager');
    expect(pmPair).toBeDefined();
    expect(pmPair![1]).toContain('engineering-architect');

    const hciPair = pairs.find(([p]) => p === 'design-hci');
    expect(hciPair).toBeDefined();
    expect(hciPair![1]).toContain('engineering-architect');
  });

  it('throws when changedFilesCount is missing', async () => {
    await expect(
      handleReviewManage({
        action: 'elect-committee',
        projectRoot: '/tmp',
        changedFractalsCount: 1,
        hasInterfaceChanges: false,
      }),
    ).rejects.toThrow('changedFilesCount');
  });

  it('throws when changedFractalsCount is missing', async () => {
    await expect(
      handleReviewManage({
        action: 'elect-committee',
        projectRoot: '/tmp',
        changedFilesCount: 1,
        hasInterfaceChanges: false,
      }),
    ).rejects.toThrow('changedFractalsCount');
  });

  it('throws when hasInterfaceChanges is missing', async () => {
    await expect(
      handleReviewManage({
        action: 'elect-committee',
        projectRoot: '/tmp',
        changedFilesCount: 1,
        changedFractalsCount: 1,
      }),
    ).rejects.toThrow('hasInterfaceChanges');
  });
});

// ─── cleanup ─────────────────────────────────────────────────────────────────

describe('handleReviewManage – cleanup', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmp();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('deletes an existing review directory', async () => {
    const reviewDir = path.join(tmpDir, '.filid', 'review', 'feature--cleanup');
    await fs.mkdir(reviewDir, { recursive: true });
    await fs.writeFile(path.join(reviewDir, 'session.md'), 'content');

    const result = await handleReviewManage({
      action: 'cleanup',
      projectRoot: tmpDir,
      branchName: 'feature/cleanup',
    });

    expect(result.deleted).toBe(true);
    await expect(fs.access(reviewDir)).rejects.toThrow();
  });

  it('does not throw when directory does not exist (force=true)', async () => {
    const result = await handleReviewManage({
      action: 'cleanup',
      projectRoot: tmpDir,
      branchName: 'feature/nonexistent',
    });
    expect(result.deleted).toBe(true);
  });

  it('throws when branchName is missing', async () => {
    await expect(
      handleReviewManage({ action: 'cleanup', projectRoot: tmpDir }),
    ).rejects.toThrow('branchName');
  });
});

// ─── content-hash ───────────────────────────────────────────────────────────

describe('handleReviewManage – content-hash', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmp();
    // Init a git repo with an initial commit on main
    const git = (args: string) =>
      execSync(`git ${args}`, { cwd: tmpDir, stdio: 'pipe' }).toString().trim();
    git('init -b main');
    git('config user.email "test@test.com"');
    git('config user.name "Test"');
    writeFileSync(path.join(tmpDir, 'file-a.ts'), 'const a = 1;');
    writeFileSync(path.join(tmpDir, 'file-b.ts'), 'const b = 2;');
    git('add .');
    git('commit -m "initial"');
    // Create feature branch with changes
    git('checkout -b feature/test');
    writeFileSync(path.join(tmpDir, 'file-a.ts'), 'const a = 42;');
    writeFileSync(path.join(tmpDir, 'file-c.ts'), 'const c = 3;');
    git('add .');
    git('commit -m "feature changes"');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('computes hash for a 2-file diff in tmp git repo', async () => {
    const result = await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/test',
      baseRef: 'main',
    });
    expect(result.sessionHash).toBeDefined();
    expect(typeof result.sessionHash).toBe('string');
    expect((result.sessionHash as string).length).toBe(64); // SHA-256 hex
    expect(result.baseCommit).toBeDefined();
    expect(result.fileHashes).toBeDefined();
    const hashes = result.fileHashes as Record<string, string>;
    expect(Object.keys(hashes)).toContain('file-a.ts');
    expect(Object.keys(hashes)).toContain('file-c.ts');
  });

  it('includes baseCommit SHA in output', async () => {
    const result = await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/test',
      baseRef: 'main',
    });
    expect(typeof result.baseCommit).toBe('string');
    expect((result.baseCommit as string).length).toBe(40); // Full SHA
  });

  it('writes content-hash.json to correct review dir', async () => {
    await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/test',
      baseRef: 'main',
    });
    const hashFile = path.join(
      tmpDir,
      '.filid',
      'review',
      'feature--test',
      'content-hash.json',
    );
    const stat = await fs.stat(hashFile);
    expect(stat.isFile()).toBe(true);
    const content = JSON.parse(await fs.readFile(hashFile, 'utf-8'));
    expect(content.sessionHash).toBeDefined();
  });

  it('deleted file uses DELETED sentinel', async () => {
    const git = (args: string) =>
      execSync(`git ${args}`, { cwd: tmpDir, stdio: 'pipe' }).toString().trim();
    git('rm file-b.ts');
    git('commit -m "delete file-b"');

    const result = await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/test',
      baseRef: 'main',
    });
    const hashes = result.fileHashes as Record<string, string>;
    expect(hashes['file-b.ts']).toBe('DELETED');
  });

  it('empty diff produces valid hash', async () => {
    // Point baseRef to HEAD so diff is empty
    const result = await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/test',
      baseRef: 'HEAD',
    });
    expect(result.sessionHash).toBeDefined();
    expect((result.sessionHash as string).length).toBe(64);
    expect(
      Object.keys(result.fileHashes as Record<string, string>),
    ).toHaveLength(0);
  });

  it('throws when baseRef is missing', async () => {
    await expect(
      handleReviewManage({
        action: 'content-hash',
        projectRoot: tmpDir,
        branchName: 'feature/test',
      }),
    ).rejects.toThrow('baseRef');
  });

  it('throws when branchName is missing', async () => {
    await expect(
      handleReviewManage({
        action: 'content-hash',
        projectRoot: tmpDir,
        baseRef: 'main',
      }),
    ).rejects.toThrow('branchName');
  });

  it('throws on orphan branch (merge-base failure)', async () => {
    const git = (args: string) =>
      execSync(`git ${args}`, { cwd: tmpDir, stdio: 'pipe' }).toString().trim();
    git('checkout --orphan orphan-branch');
    writeFileSync(path.join(tmpDir, 'orphan.ts'), 'orphan');
    git('add .');
    git('commit -m "orphan commit"');

    await expect(
      handleReviewManage({
        action: 'content-hash',
        projectRoot: tmpDir,
        branchName: 'orphan-branch',
        baseRef: 'main',
      }),
    ).rejects.toThrow('merge-base');
  });
});

// ─── check-cache ────────────────────────────────────────────────────────────

describe('handleReviewManage – check-cache', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmp();
    const git = (args: string) =>
      execSync(`git ${args}`, { cwd: tmpDir, stdio: 'pipe' }).toString().trim();
    git('init -b main');
    git('config user.email "test@test.com"');
    git('config user.name "Test"');
    writeFileSync(path.join(tmpDir, 'file-a.ts'), 'const a = 1;');
    git('add .');
    git('commit -m "initial"');
    git('checkout -b feature/cache-test');
    writeFileSync(path.join(tmpDir, 'file-a.ts'), 'const a = 99;');
    git('add .');
    git('commit -m "change"');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns cache miss when no content-hash.json exists', async () => {
    const result = await handleReviewManage({
      action: 'check-cache',
      projectRoot: tmpDir,
      branchName: 'feature/cache-test',
      baseRef: 'main',
    });
    expect(result.cacheHit).toBe(false);
    expect(result.action).toBe('proceed-full-review');
  });

  it('returns cache hit when hash matches AND review-report.md exists', async () => {
    // First, create content hash
    await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-test',
      baseRef: 'main',
    });
    // Create review-report.md to simulate completed review
    const reviewDir = path.join(
      tmpDir,
      '.filid',
      'review',
      'feature--cache-test',
    );
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), '# Report');

    const result = await handleReviewManage({
      action: 'check-cache',
      projectRoot: tmpDir,
      branchName: 'feature/cache-test',
      baseRef: 'main',
    });
    expect(result.cacheHit).toBe(true);
    expect(result.action).toBe('skip-to-existing-results');
    expect(result.existingReportPath).toContain('review-report.md');
  });

  it('returns cache miss when hash matches but review-report.md missing', async () => {
    await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-test',
      baseRef: 'main',
    });
    // No review-report.md created

    const result = await handleReviewManage({
      action: 'check-cache',
      projectRoot: tmpDir,
      branchName: 'feature/cache-test',
      baseRef: 'main',
    });
    expect(result.cacheHit).toBe(false);
    expect(result.action).toBe('proceed-full-review');
    expect(result.message).toContain('incomplete');
  });

  it('returns cache miss when content has changed', async () => {
    // Create content hash
    await handleReviewManage({
      action: 'content-hash',
      projectRoot: tmpDir,
      branchName: 'feature/cache-test',
      baseRef: 'main',
    });
    const reviewDir = path.join(
      tmpDir,
      '.filid',
      'review',
      'feature--cache-test',
    );
    await fs.writeFile(path.join(reviewDir, 'review-report.md'), '# Report');

    // Modify a file and commit
    const git = (args: string) =>
      execSync(`git ${args}`, { cwd: tmpDir, stdio: 'pipe' }).toString().trim();
    writeFileSync(path.join(tmpDir, 'file-a.ts'), 'const a = 999;');
    git('add .');
    git('commit -m "another change"');

    const result = await handleReviewManage({
      action: 'check-cache',
      projectRoot: tmpDir,
      branchName: 'feature/cache-test',
      baseRef: 'main',
    });
    expect(result.cacheHit).toBe(false);
    expect(result.action).toBe('proceed-full-review');
    expect(result.message).toContain('changed');
  });

  it('throws when baseRef is missing', async () => {
    await expect(
      handleReviewManage({
        action: 'check-cache',
        projectRoot: tmpDir,
        branchName: 'feature/cache-test',
      }),
    ).rejects.toThrow('baseRef');
  });
});
