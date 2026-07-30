import type { ConfigScope } from '@ogham/cross-platform';

import { resolveFilidRuleTarget } from './resolveFilidRuleTarget.js';
import { ruleChannelPath } from './ruleChannelPath.js';

/**
 * Where one layer's rule documents are written, as an address a user can find.
 *
 * A per-document `displayTarget` is relative to its own layer root, so the
 * user channel reads as a bare `rules/…` that looks like a project path. This
 * names the root itself, which is the part the reader is missing.
 *
 * @param projectRoot Anchor for the project channel.
 * @param scope Which layer to name; `project` by default.
 * @returns Absolute path to the channel, or `null` when the runtime host has
 *   no rule channel at all.
 */
export function getRuleDocsChannel(
  projectRoot: string,
  scope: ConfigScope = 'project',
): string | null {
  const target = resolveFilidRuleTarget(projectRoot, scope);
  return target === null ? null : ruleChannelPath(target);
}
