import type { SeiriConfigScope } from '../../../types/config.js';
import { resolveSeiriRuleTarget } from '../utils/resolveSeiriRuleTarget.js';
import { ruleChannelPath } from '../utils/ruleChannelPath.js';

/**
 * Where one layer's rule documents are written, as a whole channel rather
 * than per rule.
 *
 * `getRuleDocsStatus` answers this per document and relative to the layer's
 * own root, which cannot distinguish the two layers on its own — both end in
 * `rules` under a Claude host. A settings page naming the destination of a
 * save needs the channel, absolute.
 *
 * @param projectRoot Anchor for the project channel.
 * @param scope Which layer to describe; `project` by default.
 * @returns The absolute channel path, or `null` when the runtime host has no
 *   rule channel — a caller phrases that for its own surface rather than
 *   receiving a sentence to print.
 */
export function getRuleDocsChannel(
  projectRoot: string,
  scope: SeiriConfigScope = 'project',
): string | null {
  const target = resolveSeiriRuleTarget(projectRoot, scope);
  return target === null ? null : ruleChannelPath(target);
}
