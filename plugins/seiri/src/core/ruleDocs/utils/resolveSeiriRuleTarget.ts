import { resolveProjectRuleTarget } from '@ogham/agent-artifacts/targets/project/rules';

import { findRepoRoot } from '../../utils/findRepoRoot.js';

import { resolveSeiriArtifactHost } from './resolveSeiriArtifactHost.js';

export function resolveSeiriRuleTarget(
  projectRoot: string,
): ReturnType<typeof resolveProjectRuleTarget> | null {
  const host = resolveSeiriArtifactHost();
  if (host === null) return null;

  return resolveProjectRuleTarget({
    host,
    projectRoot: findRepoRoot(projectRoot),
  });
}
