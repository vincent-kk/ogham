import {
  type DirectoryRuleTarget,
  type SectionArtifactTarget,
  resolveProjectRuleTarget,
  resolveUserRuleTarget,
} from '@ogham/agent-artifacts';
import type { ConfigScope } from '@ogham/cross-platform';

import { resolveGitRoot } from '../utils/resolveGitRoot.js';

import { resolveFilidArtifactHost } from './resolveFilidArtifactHost.js';

/**
 * Where filid's rule documents live for the chosen layer.
 *
 * @param projectRoot Anchor for the project channel, resolved to its git root;
 *   unused under `user`, whose root is the host state directory instead.
 * @param scope Which layer decides. `project` writes the repository channel;
 *   `user` writes the host state root, where the rules reach every project.
 * @returns The resolved target, or `null` when the runtime host has no rule
 *   channel at all.
 */
export function resolveFilidRuleTarget(
  projectRoot: string,
  scope: ConfigScope = 'project',
): DirectoryRuleTarget | SectionArtifactTarget | null {
  const host = resolveFilidArtifactHost();
  if (host === null) return null;

  return scope === 'user'
    ? resolveUserRuleTarget({ host })
    : resolveProjectRuleTarget({
        host,
        projectRoot: resolveGitRoot(projectRoot),
      });
}
