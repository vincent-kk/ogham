import {
  type ManagedRuleDocument,
  createRuleDocumentManager,
} from '@ogham/agent-artifacts';
import type { ConfigScope } from '@ogham/cross-platform';

import { FILID_ARTIFACT_OWNER } from '../../../../constants/ruleDocs.js';

import type { RetiredScopeReport, RuleDocsManifest } from './manifestTypes.js';
import { mapRuleSyncResult } from './mapRuleSyncResult.js';
import { resolveFilidRuleTarget } from './resolveFilidRuleTarget.js';
import { ruleChannelPath } from './ruleChannelPath.js';

/**
 * Withdraw filid's rule documents from the layer that was not chosen, so a
 * rule the host loads exists at exactly one address.
 *
 * Call this only after the chosen layer has been written. Reversed, a failure
 * between the two steps leaves the rules deployed in neither layer.
 *
 * The owned-namespace limit lives inside the rule manager, so a document
 * another plugin deployed to the same channel is never a candidate.
 *
 * @param projectRoot Anchor for the project channel.
 * @param written The layer just deployed to; its opposite is the one cleared.
 * @param documents Manifest documents, naming the addresses to withdraw.
 * @param manifest Source of the id-to-filename mapping used for reporting.
 * @returns What was removed, or `null` when the other layer held nothing of
 *   filid's or the runtime host has no rule channel at all.
 */
export function retireOtherScopeRuleDocs(
  projectRoot: string,
  written: ConfigScope,
  documents: readonly ManagedRuleDocument[],
  manifest: RuleDocsManifest,
): RetiredScopeReport | null {
  const scope: ConfigScope = written === 'user' ? 'project' : 'user';
  const target = resolveFilidRuleTarget(projectRoot, scope);
  if (target === null) return null;

  const manager = createRuleDocumentManager({
    owner: FILID_ARTIFACT_OWNER,
    target,
  });
  const applied = manager.apply(
    manager.plan({
      documents,
      desired: new Set<string>(),
      replaceDrift: new Set<string>(),
    }),
  );

  const filenames = mapRuleSyncResult(applied, manifest).removed;
  if (filenames.length === 0) return null;

  return { scope, displayTarget: ruleChannelPath(target), filenames };
}
