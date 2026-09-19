import { rmSync } from 'node:fs';

import type { ReviewStateSealFixture } from '../../../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';

import { restoreHostPluginRoot } from './restoreHostPluginRoot.js';

/**
 * Remove a seal fixture's temporary roots and restore the host plugin root.
 * @param fixture Fixture created by `createReviewStateSealFixture`.
 * @returns Nothing; both temporary directories are deleted and `CLAUDE_PLUGIN_ROOT` is restored.
 */
export function disposeReviewStateSealFixture(
  fixture: ReviewStateSealFixture,
): void {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  restoreHostPluginRoot(fixture.originalPluginRoot);
}
