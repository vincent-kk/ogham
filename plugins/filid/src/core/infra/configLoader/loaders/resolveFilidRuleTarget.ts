import type {
  DirectoryRuleTarget,
  SectionArtifactTarget,
} from '@ogham/agent-artifacts/targets';
import { resolveProjectRuleTarget } from '@ogham/agent-artifacts/targets/project/rules';

import { resolveGitRoot } from '../utils/resolveGitRoot.js';

import { resolveFilidArtifactHost } from './resolveFilidArtifactHost.js';

export function resolveFilidRuleTarget(
  projectRoot: string,
): DirectoryRuleTarget | SectionArtifactTarget | null {
  const host = resolveFilidArtifactHost();
  return host === null
    ? null
    : resolveProjectRuleTarget({
        host,
        projectRoot: resolveGitRoot(projectRoot),
      });
}
