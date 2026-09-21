import { mkdtempSync, readFileSync } from 'node:fs';

import { portableJoin, tmp } from '@ogham/cross-platform';

import { resolveReviewStateFixtureArtifact } from '../../../unit/mcp/reviewState/helpers/resolveReviewStateFixtureArtifact.js';

import { createPreservedReviewRepository } from './createPreservedReviewRepository.js';
import { runPinnedReviewGit } from './runPinnedReviewGit.js';
import {
  type PreservedTreeRoots,
  copyPreservedTreeWithRoots,
} from './utils/copyPreservedTreeWithRoots.js';

/**
 * Rebuild the preserved repository and restore the preserved review state and plugin root onto it.
 * The fixture keeps the generation flat; its canonical `.filid/review` locations are recomputed here,
 * the state first so the generation directory resolves from its `generationId`.
 * @param fixtureDirectory Directory holding `config.json`, `review-state.json`, `generation/` and `plugin/`.
 * @returns Machine-local roots; the caller points `CLAUDE_PLUGIN_ROOT` at `pluginRoot`.
 */
export async function restorePreservedReviewState(
  fixtureDirectory: string,
): Promise<PreservedTreeRoots> {
  const created = await createPreservedReviewRepository();
  const roots = {
    projectRoot: runPinnedReviewGit(created, ['rev-parse', '--show-toplevel']),
    pluginRoot: mkdtempSync(portableJoin(tmp(), 'filid-review-plugin-')),
  };
  const fixture = (name: string) => portableJoin(fixtureDirectory, name);
  const { normalizedBranch } = JSON.parse(
    readFileSync(fixture('review-state.json'), 'utf8'),
  ) as { normalizedBranch: string };
  const artifact = (path: string) =>
    resolveReviewStateFixtureArtifact(
      roots.projectRoot,
      normalizedBranch,
      path,
    );
  for (const [from, to] of [
    ['plugin', () => roots.pluginRoot],
    [
      'config.json',
      () => portableJoin(roots.projectRoot, '.filid/config.json'),
    ],
    ['review-state.json', () => artifact('review-state.json')],
    ['generation', () => artifact('.')],
  ] as const)
    copyPreservedTreeWithRoots(fixture(from), to(), roots);
  return roots;
}
