import type { SeiriConfigScope } from '../../../types/config.js';
import type { RuleDocStatus } from '../../../types/manifest.js';
import { resolveSeiriRuleTarget } from '../utils/resolveSeiriRuleTarget.js';

import { buildRuleDocsStatus } from './buildRuleDocsStatus.js';

/**
 * Snapshot every manifest rule against one layer's rule channel.
 *
 * The filesystem is the only thing consulted: a rule is selected because
 * its file is on disk, never because a config said so. That is what keeps
 * the checkbox UI honest after a user deletes a file by hand.
 *
 * @param projectRoot Anchor for the project channel.
 * @param pluginRoot Root the manifest and templates are read from.
 * @param scope Which layer to inspect; `project` by default, so a session
 *   hook that has not been taught about layers keeps reporting the channel
 *   every existing deployment sits in.
 * @returns One entry per shipped rule, in manifest order.
 */
export function getRuleDocsStatus(
  projectRoot: string,
  pluginRoot: string,
  scope: SeiriConfigScope = 'project',
): RuleDocStatus[] {
  return buildRuleDocsStatus(pluginRoot, () =>
    resolveSeiriRuleTarget(projectRoot, scope),
  );
}
