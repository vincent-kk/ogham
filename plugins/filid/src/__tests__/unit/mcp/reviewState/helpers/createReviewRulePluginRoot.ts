import { mkdtempSync } from 'node:fs';

import {
  ensureDirectorySync,
  portableJoin,
  resolveContainedPath,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { writeReviewActorMethods } from './writeReviewActorMethods.js';

/**
 * Create a temporary plugin root containing the minimal valid review rule map.
 *
 * @returns The temporary plugin root for a review-state test.
 */
export function createReviewRulePluginRoot(): string {
  const pluginRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-plugin-'));
  const rulesDirectory = resolveContainedPath(
    pluginRoot,
    'skills/cross-review/rules',
  );
  ensureDirectorySync(rulesDirectory);
  writeFileAtomicallySync(
    resolveContainedPath(rulesDirectory, 'rules.json'),
    `${JSON.stringify({
      schema_version: 1,
      rules: [{ id: 'default', always: true, file: 'default.md' }],
    })}\n`,
  );
  writeFileAtomicallySync(
    resolveContainedPath(rulesDirectory, 'default.md'),
    '# Default review rule\n',
  );
  writeReviewActorMethods(pluginRoot);
  return pluginRoot;
}
