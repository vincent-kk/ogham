import {
  type DirectoryRuleTarget,
  type SectionArtifactTarget,
  resolveProjectRuleTarget,
  resolveUserRuleTarget,
} from '@ogham/agent-artifacts';

import type { SeiriConfigScope } from '../../../types/config.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';

import { resolveSeiriArtifactHost } from './resolveSeiriArtifactHost.js';

/**
 * Where seiri's rule documents live for the chosen layer.
 *
 * @param projectRoot Anchor for the project channel; unused under `user`,
 *   whose root comes from the host state directory instead.
 * @param scope Which layer decides. `project` writes the repository channel;
 *   `user` writes the host state root, where the rules reach every project.
 * @returns The resolved target, or `null` when the runtime host has no rule
 *   channel at all.
 */
export function resolveSeiriRuleTarget(
  projectRoot: string,
  scope: SeiriConfigScope = 'project',
): DirectoryRuleTarget | SectionArtifactTarget | null {
  const host = resolveSeiriArtifactHost();
  if (host === null) return null;

  return scope === 'user'
    ? resolveUserRuleTarget({ host })
    : resolveProjectRuleTarget({
        host,
        projectRoot: findRepoRoot(projectRoot),
      });
}
