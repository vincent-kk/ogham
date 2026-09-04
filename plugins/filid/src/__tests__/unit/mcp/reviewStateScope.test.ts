import { mkdtempSync, rmSync } from 'node:fs';

import {
  ensureDirectorySync,
  portableDirname,
  portableJoin,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
  spawnCliSync,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_FILE_NAMES,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

let projectRoot: string;
const BRANCH = 'feature/scope';

function git(args: readonly string[]): string {
  const result = spawnCliSync('git', args, { cwd: projectRoot });
  if (result.code !== 0 || result.spawnError)
    throw new Error(result.stderr || result.spawnError?.message);
  return result.stdout.trimEnd();
}

function writeProjectFile(relativePath: string, content: string): void {
  const filePath = resolveContainedPath(projectRoot, relativePath);
  ensureDirectorySync(portableDirname(filePath));
  writeFileAtomicallySync(filePath, content);
}

beforeEach(() => {
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-scope-'));
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'filid@example.test']);
  git(['config', 'user.name', 'Filid Test']);
  writeProjectFile(
    '.filid/config.json',
    `${JSON.stringify({
      version: '2.0',
      language: 'English',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      structure: { generatedPaths: ['generated'] },
    })}\n`,
  );
  writeProjectFile(
    'INTENT.md',
    '# Fixture\n\n## Purpose\n\nTest fixture.\n\n## Conventions\n\n- Keep deterministic.\n\n## Boundaries\n\n### Always do\n\n- Test.\n\n### Ask first\n\n- Contract changes.\n\n### Never do\n\n- Publish.\n',
  );
  writeProjectFile(
    'DETAIL.md',
    '# Fixture contract\n\n## Requirements\n\n- Stay deterministic.\n\n## API Contracts\n\n- None.\n\n## Acceptance Criteria\n\n### AC-fixture\n\n- The fixture loads.\n\n## Last Updated\n\n2026-09-04\n',
  );
  writeProjectFile(
    'index.ts',
    "export { modified } from './src/modified.js';\n",
  );
  writeProjectFile('src/modified.ts', "export const modified = 'base';\n");
  writeProjectFile('src/deleted.ts', "export const deleted = 'base';\n");
  git(['add', '--all']);
  git(['commit', '-m', 'base']);
  git(['checkout', '-b', BRANCH]);
  writeProjectFile(
    'src/modified.ts',
    "export const modified = 'feature';\nexport const extra = true;\n",
  );
  rmSync(resolveContainedPath(projectRoot, 'src/deleted.ts'));
  writeProjectFile('src/added.ts', "export const added = 'feature';\n");
  git(['add', '--all']);
  git(['commit', '-m', 'feature scope']);
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

describe('review_state scope', () => {
  it('names scope when rejecting an invalid action', async () => {
    await expect(
      handleReviewState({
        action: 'invalid',
        projectRoot,
        branchName: BRANCH,
      }),
    ).rejects.toThrow(
      'action must be prepare, checkpoint, scope, seal, or cleanup',
    );
  });

  it('reports missing without a prepared state', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SCOPE,
      projectRoot,
      branchName: BRANCH,
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.MISSING);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_MISSING,
      }),
    );
  });

  it('reports stale when committed content changes after prepare', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    writeProjectFile('src/added.ts', "export const added = 'changed';\n");
    git(['add', '--all']);
    git(['commit', '-m', 'change prepared content']);

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SCOPE,
      projectRoot,
      branchName: BRANCH,
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.STALE);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE,
      }),
    );
  });

  it('writes scoped evidence with the committed A/M/D roster and churn', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SCOPE,
      projectRoot,
      branchName: BRANCH,
    });

    expect(result.status).toBe('ok');
    expect(result.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.SCOPED);
    expect(result.data.files?.map(({ change }) => change).sort()).toEqual([
      'A',
      'D',
      'M',
    ]);
    expect(
      result.data.files?.every(
        ({ insertions, deletions }) => insertions + deletions > 0,
      ),
    ).toBe(true);
    expect(readUtf8FileIfExistsSync(result.data.evidencePath ?? '')).toContain(
      'review_schema: 6',
    );
  });

  it('observes generated-only dirt without changing the successful status', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    writeProjectFile('generated/output.js', 'generated\n');

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SCOPE,
      projectRoot,
      branchName: BRANCH,
    });

    expect(result.status).toBe('ok');
    expect(result.summary.worktree).toBe('generated-only');
    expect(result.data.dirtyPaths).toEqual(['generated/']);
  });

  it('rejects a sealed state with the sealed diagnostic', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    writeFileAtomicallySync(
      resolveContainedPath(
        prepared.data.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.REPORT,
      ),
      '# Review\n',
    );
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot,
      branchName: BRANCH,
    });

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SCOPE,
      projectRoot,
      branchName: BRANCH,
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.STALE);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_SEALED,
      }),
    );
  });

  it('keeps complete evidence for a changed non-verification source file', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SCOPE,
      projectRoot,
      branchName: BRANCH,
    });

    expect(result.data.files).toContainEqual(
      expect.objectContaining({ path: 'src/modified.ts', role: 'source' }),
    );
    expect(result.data.statuses?.verification).not.toBe('indeterminate');
    expect(result.summary.evidenceComplete).toBe(true);
  });

  it('ignores a collapsed untracked .filid directory that only holds review state', async () => {
    rmSync(resolveContainedPath(projectRoot, '.filid/config.json'));
    git(['add', '--all']);
    git(['commit', '-m', 'remove project config']);
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SCOPE,
      projectRoot,
      branchName: BRANCH,
    });

    expect(result.summary.worktree).toBe('clean');
    expect(result.data.dirtyPaths).toEqual([]);
  });

  it('keeps per-finding rows out of evidence diagnostics', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    writeProjectFile('observed/INTENT.md', '# Invalid contract\n');

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SCOPE,
      projectRoot,
      branchName: BRANCH,
    });
    const evidence = readUtf8FileIfExistsSync(result.data.evidencePath ?? '');
    const diagnostics = evidence?.split('## Diagnostics')[1] ?? '';

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'intent-document-contract' }),
    );
    expect(diagnostics).not.toContain('intent-document-contract');
  });
});
