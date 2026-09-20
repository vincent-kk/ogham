import { afterEach, describe, expect, it } from 'vitest';

import { isOutOfScopeVerificationDiagnostic } from '../../../../mcp/tools/reviewState/scope/utils/isOutOfScopeVerificationDiagnostic.js';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import {
  PINNED_REVIEW_BRANCH,
  type PinnedReviewRepositoryFiles,
  createPinnedReviewRepository,
} from '../../../integration/reviewFlow/helpers/createPinnedReviewRepository.js';
import { disposeReviewStateSealFixture } from '../../../integration/reviewFlow/helpers/disposeReviewStateSealFixture.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewRulePluginRoot } from './helpers/createReviewRulePluginRoot.js';
import type { ReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Fixture of the running case, disposed after it. */
let fixture: ReviewStateSealFixture | undefined;

afterEach(() => {
  if (fixture) disposeReviewStateSealFixture(fixture);
  fixture = undefined;
});

/**
 * Prepare a review of the given repository and return its scope diagnostics.
 * @param repository Base and feature files of the pinned repository.
 * @returns The codes and paths prepare recorded in the review scope.
 */
async function prepareDiagnostics(
  repository: PinnedReviewRepositoryFiles,
): Promise<{ code: string; path?: string }[]> {
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  const pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  fixture = {
    projectRoot: await createPinnedReviewRepository(repository),
    pluginRoot,
    branchName: PINNED_REVIEW_BRANCH,
    originalPluginRoot,
  };
  const { projectRoot, branchName } = fixture;
  await configureReviewGroups(projectRoot, 1);
  const prepared = await handleReviewState({
    action: 'prepare',
    projectRoot,
    branchName,
    baseRef: 'main',
    effort: 'low',
  });
  return (readPreparedReviewState(prepared).scope.diagnostics ?? []).map(
    ({ code, path }) => ({ code, ...(path === undefined ? {} : { path }) }),
  );
}

describe('an unresolved reference in an unrelated verification file', () => {
  it('does not enter the review scope, and the review still seals', async () => {
    const diagnostics = await prepareDiagnostics({
      base: {
        'src/value.ts': 'export const value = 1;\n',
        'src/unrelated.test.ts':
          "import { gone } from './gone.js';\nit('holds', () => gone);\n",
        'yarn.lock': 'base-lock\n',
      },
      feature: {
        'src/value.ts': 'export const value = 2;\n',
        'yarn.lock': 'feature-lock\n',
      },
    });

    // The file is not in the change set and names nothing that is; a test
    // nobody touched must not turn every review of this repository
    // inconclusive.
    expect(diagnostics).toEqual([]);
    if (!fixture) throw new Error('fixture was not created');
    await completeIncrementalReview(fixture.projectRoot);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    expect(sealed.summary).toMatchObject({ verdict: 'APPROVED' });
  }, 300_000);
});

describe('a change that deletes or moves what an untouched test imports', () => {
  it('keeps the diagnostic when the change deleted the imported file', async () => {
    const diagnostics = await prepareDiagnostics({
      base: {
        'src/thing.ts': 'export const thing = 1;\n',
        'src/other.test.ts':
          "import { thing } from './thing.js';\nit('holds', () => thing);\n",
        'yarn.lock': 'base-lock\n',
      },
      feature: { 'yarn.lock': 'feature-lock\n' },
      remove: ['src/thing.ts'],
    });

    // The deletion under review is what broke this import. Dropping it would
    // seal APPROVED over a test the change just broke.
    expect(diagnostics).toContainEqual({
      code: 'unresolved-local-dependency',
      path: 'src/other.test.ts',
    });
  }, 300_000);

  it('keeps it when the change moved a directory index the test imports', async () => {
    const diagnostics = await prepareDiagnostics({
      base: {
        'src/thing/index.ts': 'export const thing = 1;\n',
        'src/other.test.ts':
          "import { thing } from './thing';\nit('holds', () => thing);\n",
        'yarn.lock': 'base-lock\n',
      },
      feature: {
        'src/moved/index.ts': 'export const thing = 1;\n',
        'yarn.lock': 'feature-lock\n',
      },
      remove: ['src/thing/index.ts'],
    });

    // A module index answers to its directory's name, and after the move the
    // tree no longer says which kind the deleted path was.
    expect(diagnostics).toContainEqual({
      code: 'unresolved-local-dependency',
      path: 'src/other.test.ts',
    });
  }, 300_000);
});

describe('the exception that keeps a broken import of a changed file', () => {
  /**
   * Judge one unresolved-reference diagnostic against a one-file change set.
   * @param specifier What the untouched test file failed to resolve.
   * @returns Whether the diagnostic is dropped as out of scope.
   */
  function dropped(specifier: string): boolean {
    return isOutOfScopeVerificationDiagnostic({
      diagnostic: {
        code: 'unresolved-local-dependency',
        message: 'unresolved',
        path: '/project/src/unrelated.test.ts',
        nextAction: 'fix it',
        affects: ['dependencies', 'boundaries'],
        specifier,
      },
      projectRoot: '/project',
      scopePaths: { changed: new Set(['src/value.ts']), neighbours: [] },
      isVerificationFile: (relativePath) =>
        relativePath === 'src/unrelated.test.ts',
      changedNames: ['value', 'thing'],
    });
  }

  it.for([
    ['a bare specifier that is the name', 'thing'],
    ['a bare specifier whose first segment is the name', 'thing/inner.js'],
    ['a path-mapped first segment', 'auth/thing.js'],
    ['a hash alias', '#thing'],
    ['a tilde alias', '~/thing.js'],
    ['a scope alias', '@/thing.js'],
    ['a relative specifier', './thing.js'],
    ['a parent specifier', '../thing/index.js'],
  ] as const)('keeps the diagnostic for %s', ([, specifier]) => {
    // The specifier is not file text: nothing quotes it, so the name can start
    // it. A miss here drops the diagnostic and seals over a test this change
    // broke.
    expect(dropped(specifier)).toBe(false);
  });

  it.for([
    ['a longer name', './thingamajig.js'],
    ['a name inside a word', './something.js'],
    ['another directory', './other/inner.js'],
  ] as const)('drops it for %s', ([, specifier]) => {
    expect(dropped(specifier)).toBe(true);
  });

  it('keeps the diagnostic when the reference spells a changed name', () => {
    // The rename under review is what broke this import; dropping it here
    // would hide a consequence of the change.
    expect(dropped('./value.js')).toBe(false);
  });

  it('drops it when the reference names nothing this review changed', () => {
    expect(dropped('./gone.js')).toBe(true);
  });

  it('keeps a diagnostic about a file that is not verification', () => {
    expect(
      isOutOfScopeVerificationDiagnostic({
        diagnostic: {
          code: 'unresolved-local-dependency',
          message: 'unresolved',
          path: '/project/src/production.ts',
          nextAction: 'fix it',
          affects: ['dependencies', 'boundaries'],
          specifier: './gone.js',
        },
        projectRoot: '/project',
        scopePaths: { changed: new Set(['src/value.ts']), neighbours: [] },
        isVerificationFile: () => false,
        changedNames: ['value'],
      }),
    ).toBe(false);
  });
});
