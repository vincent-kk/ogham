import {
  type DirectoryRuleTarget,
  type SectionArtifactTarget,
  resolveUserRuleTarget,
} from '@ogham/agent-artifacts';

import type { SeiriConfigScope } from '../../../types/config.js';

import { resolveSeiriArtifactHost } from './resolveSeiriArtifactHost.js';
import { resolveSeiriProjectRuleTarget } from './resolveSeiriProjectRuleTarget.js';

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
  if (scope !== 'user') return resolveSeiriProjectRuleTarget(projectRoot);

  const host = resolveSeiriArtifactHost();
  return host === null ? null : resolveUserRuleTarget({ host });
}
