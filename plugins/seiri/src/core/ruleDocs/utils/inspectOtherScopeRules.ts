import type { ManagedRuleDocument } from '@ogham/agent-artifacts';

import type { SeiriConfigScope } from '../../../types/config.js';
import type { RuleDocScopeReport } from '../../../types/manifest.js';

import { createSeiriRuleManager } from './createSeiriRuleManager.js';
import { resolveSeiriRuleTarget } from './resolveSeiriRuleTarget.js';
import { ruleChannelPath } from './ruleChannelPath.js';

/**
 * Read what this owner has deployed at the layer the caller did not choose.
 *
 * Reads only — a preview calls this to show what saving would move, and the
 * removal path calls it to decide whether there is anything to remove at all.
 *
 * @param projectRoot Anchor for the project channel.
 * @param documents The manifest's managed documents; the inspection set, so
 *   a document this owner no longer ships is not reported here.
 * @param scope The layer the caller chose. The report describes the other one.
 * @returns The other layer's deployed documents, or `null` when that layer
 *   has no rule channel or holds none of this owner's — a caller must not
 *   ask the user to confirm a move that would move nothing.
 */
export function inspectOtherScopeRules(
  projectRoot: string,
  documents: readonly ManagedRuleDocument[],
  scope: SeiriConfigScope,
): RuleDocScopeReport | null {
  const other: SeiriConfigScope = scope === 'user' ? 'project' : 'user';
  const target = resolveSeiriRuleTarget(projectRoot, other);
  const manager = createSeiriRuleManager(projectRoot, other);
  if (target === null || manager === null) return null;

  const filenames = manager
    .inspect(documents)
    .filter((inspection) => inspection.deployed)
    .map((inspection) => inspection.filename);
  if (filenames.length === 0) return null;

  return {
    scope: other,
    displayTarget: ruleChannelPath(target),
    filenames,
  };
}
