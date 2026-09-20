import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import { readReviewState } from '../../../mcp/tools/reviewState/state/readReviewState.js';
import { resolveReviewStatePaths } from '../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import { createReviewRulePluginRoot } from '../../unit/mcp/reviewState/helpers/createReviewRulePluginRoot.js';

import { createPinnedReviewRepository } from './helpers/createPinnedReviewRepository.js';
import { restoreHostPluginRoot } from './helpers/restoreHostPluginRoot.js';
import { PLAIN_REVIEW_REPOSITORY } from './helpers/reviewFlowRepositoryFiles.js';
import { runPinnedReviewGit } from './helpers/runPinnedReviewGit.js';

/** Preserved pre-incremental v7 calibration runs; their source repositories are not preserved. */
const BASELINE_ROOT = fileURLToPath(
  new URL(
    '../../../../../../.metadata/filid/cross-review-calibration/baseline-v7/',
    import.meta.url,
  ),
);

/** Repository that hosts one legacy state under its original branch key. */
let projectRoot: string;
/** Plugin root holding the fixture rules and actor methods. */
let pluginRoot: string;
/** Host plugin root restored after each case. */
const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

/**
 * Install a baseline run's sealed state as the active state of its branch.
 * @param run Baseline run directory name.
 * @returns Branch name recorded by the legacy state.
 */
function installLegacyState(run: string): string {
  const text = readFileSync(
    portableJoin(BASELINE_ROOT, run, 'review-state.json'),
    'utf8',
  ).replaceAll('<PROJECT_ROOT>', projectRoot);
  const { branchName, normalizedBranch } = JSON.parse(text) as {
    branchName: string;
    normalizedBranch: string;
  };
  runPinnedReviewGit(projectRoot, ['checkout', '-b', branchName]);
  const paths = resolveReviewStatePaths(projectRoot, branchName);
  expect(paths.normalizedBranch).toBe(normalizedBranch);
  mkdirSync(dirname(paths.statePath), { recursive: true });
  writeFileSync(paths.statePath, text);
  return branchName;
}

beforeEach(() => {
  pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  projectRoot = runPinnedReviewGit(
    createPinnedReviewRepository(PLAIN_REVIEW_REPOSITORY),
    ['rev-parse', '--show-toplevel'],
  );
});
afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(pluginRoot, { recursive: true, force: true });
  restoreHostPluginRoot(originalPluginRoot);
});

describe('legacy baseline-v7 state readback through the handler', () => {
  it.each(['a', 'b', 'c', 'd', 'f', 'g', 'h'])(
    'current behavior: run %s parses as a v2 state, checkpoint and seal refuse its missing validation policy, and prepare archives it for a new generation',
    async (run) => {
      const branchName = installLegacyState(run);
      const restored = readReviewState(
        resolveReviewStatePaths(projectRoot, branchName).statePath,
      );
      expect(restored).toMatchObject({ phase: 'sealed', schemaVersion: 2 });
      for (const action of ['checkpoint', 'seal'] as const)
        await expect(
          handleReviewState({ action, projectRoot, branchName }),
        ).rejects.toMatchObject({
          code: 'review-validation-policy-outdated',
        });
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot,
        branchName,
        baseRef: 'main',
      });
      expect(prepared.status).toBe('ok');
      expect(
        prepared.diagnostics.find(
          ({ code }) => code === 'review-state-replaced',
        )?.message,
      ).toContain('review-validation-policy-outdated');
    },
  );
});
