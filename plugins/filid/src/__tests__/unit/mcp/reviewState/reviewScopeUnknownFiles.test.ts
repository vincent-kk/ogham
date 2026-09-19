import { afterEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import {
  PINNED_REVIEW_BRANCH,
  type PinnedReviewRepositoryFiles,
  createPinnedReviewRepository,
} from '../../../integration/reviewFlow/helpers/createPinnedReviewRepository.js';
import { disposeReviewStateSealFixture } from '../../../integration/reviewFlow/helpers/disposeReviewStateSealFixture.js';
import {
  FIXTURE_INTENT,
  PLAIN_REVIEW_REPOSITORY,
} from '../../../integration/reviewFlow/helpers/reviewFlowRepositoryFiles.js';

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
 * Pin a repository whose base also holds `src/note.tsx`, an unchanged file the
 * lexer cannot trust after its JSX apostrophe.
 * @param note Text of `src/note.tsx`.
 * @param repository Base and feature files around the note; the plain repository by default.
 * @returns Nothing; `fixture` holds the repository and plugin root.
 */
function pinRepositoryWithNote(
  note: string,
  repository: PinnedReviewRepositoryFiles = PLAIN_REVIEW_REPOSITORY,
): void {
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  const pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  fixture = {
    projectRoot: createPinnedReviewRepository({
      base: {
        ...repository.base,
        'src/note.tsx': note,
        'src/other.ts': 'export const other = 1;\n',
      },
      feature: repository.feature,
    }),
    pluginRoot,
    branchName: PINNED_REVIEW_BRANCH,
    originalPluginRoot,
  };
  configureReviewGroups(fixture.projectRoot, 1);
}

describe('review certainty counts only unknown files inside the review scope', () => {
  // src/value.ts changes; src/note.tsx is unchanged and uncertain.
  it.each([
    {
      label: 'names no changed file',
      note: "export const Note = () => <p>Don't</p>; export { other } from './other.js';\n",
      verdict: 'APPROVED',
      complete: true,
      dependencies: 'exact',
    },
    {
      label: 'names no changed file and loads a missing file',
      note: "export const Note = () => <p>Don't</p>; export { gone } from './gone.js';\n",
      verdict: 'APPROVED',
      complete: true,
      dependencies: 'exact',
      outOfScope: ['unresolved-local-dependency'],
    },
    {
      label: 'names the changed file as a path token',
      note: "export const Note = () => <p>Don't</p>; export { value } from './value.js';\n",
      verdict: 'INCONCLUSIVE',
      complete: false,
      dependencies: 'indeterminate',
    },
  ])(
    'seals $verdict when the uncertain file $label',
    async ({ note, verdict, complete, dependencies, outOfScope }) => {
      pinRepositoryWithNote(note);
      if (!fixture) throw new Error('fixture was not created');
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        baseRef: 'main',
        effort: 'low',
      });
      const state = readPreparedReviewState(prepared);
      expect(state.scope.evidenceComplete).toBe(complete);
      expect(state.scope.statuses.analysisAxes?.dependencies).toBe(
        dependencies,
      );
      if (outOfScope)
        expect(
          state.scope.outOfScopeDiagnostics?.map(({ code }) => code),
        ).toEqual(outOfScope);
      await completeIncrementalReview(fixture.projectRoot);
      const sealed = await handleReviewState({
        action: 'seal',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      });
      expect(sealed.summary).toMatchObject({
        verdict,
        reviewComplete: complete,
      });
    },
  );
});

/** Root documents and entry that make the root fractal own the changed `src/value.ts`; no stray root peer. */
const ROOT_OWNER_REPOSITORY: PinnedReviewRepositoryFiles = {
  base: {
    'INTENT.md': FIXTURE_INTENT,
    'DETAIL.md':
      '# Fixture contract\n\n## Requirements\n\n- Keep the value.\n\n## API Contracts\n\n- The entry exports the value.\n\n## Acceptance Criteria\n\n### AC-fixture\n\n- The value is exported.\n\n## Last Updated\n\n2026-09-20\n',
    'index.ts': "export { value } from './src/value.js';\n",
    'src/value.ts': 'export const value = 1;\n',
  },
  feature: { 'src/value.ts': 'export const value = 2;\n' },
};

describe('graph-uncertainty rule results follow the review scope in a root-owned repository', () => {
  /**
   * Prepare a root-owned review and return its candidates of the three graph-certainty rules.
   * @param note Text of the unchanged uncertain file.
   * @returns Messages of those candidates.
   */
  async function graphUncertaintyCandidates(note: string): Promise<string[]> {
    pinRepositoryWithNote(note, ROOT_OWNER_REPOSITORY);
    if (!fixture) throw new Error('fixture was not created');
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'low',
    });
    return readPreparedReviewState(prepared)
      .scope.candidates.filter(({ certainty }) => certainty === 'indeterminate')
      .map(({ message }) => message);
  }

  it('raises no analysis-indeterminate candidate for an unknown file outside the scope, and seals APPROVED', async () => {
    expect(
      await graphUncertaintyCandidates(
        "export const Note = () => <p>Don't</p>; export { other } from './other.js';\n",
      ),
    ).toEqual([]);
    if (!fixture) throw new Error('fixture was not created');
    await completeIncrementalReview(fixture.projectRoot);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    expect(sealed.summary).toMatchObject({ verdict: 'APPROVED' });
  });

  it('names the in-scope unknown files in the candidate it raises', async () => {
    const messages = await graphUncertaintyCandidates(
      "export const Note = () => <p>Don't</p>; export { value } from './value.js';\n",
    );
    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) expect(message).toContain('src/note.tsx');
  });
});

describe('a changed module index at the project root relates every unknown file', () => {
  it('keeps the graph indeterminate and names the unrelated-looking unknown file', async () => {
    pinRepositoryWithNote(
      "export const Note = () => <p>Don't</p>; export { other } from './other.js';\n",
      {
        base: ROOT_OWNER_REPOSITORY.base,
        feature: {
          'index.ts':
            "export { value } from './src/value.js';\nexport const extra = 1;\n",
        },
      },
    );
    if (!fixture) throw new Error('fixture was not created');
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'low',
    });
    const state = readPreparedReviewState(prepared);
    expect(state.scope.statuses.analysisAxes?.dependencies).toBe(
      'indeterminate',
    );
    const messages = state.scope.candidates
      .filter(({ certainty }) => certainty === 'indeterminate')
      .map(({ message }) => message);
    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) expect(message).toContain('src/note.tsx');
  });
});
