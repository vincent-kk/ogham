import {
  type DirectoryRuleTarget,
  type SectionArtifactTarget,
  resolveProjectRuleTarget,
} from '@ogham/agent-artifacts';

import { findRepoRoot } from '../../utils/findRepoRoot.js';

import { resolveSeiriArtifactHost } from './resolveSeiriArtifactHost.js';

/**
 * Where seiri's rule documents live for the project layer only — the
 * layer every hook reads, so a hook-only caller never pulls in the user
 * layer's resolution code.
 * @param projectRoot Anchor for the project channel.
 * @returns The resolved target, or `null` when the runtime host has no
 *   rule channel at all.
 */
export function resolveSeiriProjectRuleTarget(
  projectRoot: string,
): DirectoryRuleTarget | SectionArtifactTarget | null {
  const host = resolveSeiriArtifactHost();
  return host === null
    ? null
    : resolveProjectRuleTarget({
        host,
        projectRoot: findRepoRoot(projectRoot),
      });
}
