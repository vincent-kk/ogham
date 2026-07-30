import {
  type RuleDocumentManager,
  createRuleDocumentManager,
} from '@ogham/agent-artifacts';
import type { ConfigScope } from '@ogham/cross-platform';

import { FILID_ARTIFACT_OWNER } from '../../../../constants/ruleDocs.js';

import { resolveFilidRuleTarget } from './resolveFilidRuleTarget.js';

/**
 * Rule document manager bound to one layer's channel.
 *
 * @param projectRoot Anchor for the project channel.
 * @param scope Which layer's channel to manage; `project` by default so a
 *   caller that has not been taught about layers keeps its old behavior.
 * @returns The manager, or `null` when the runtime host has no rule channel.
 */
export function createFilidRuleManager(
  projectRoot: string,
  scope: ConfigScope = 'project',
): RuleDocumentManager | null {
  const target = resolveFilidRuleTarget(projectRoot, scope);
  return target === null
    ? null
    : createRuleDocumentManager({
        owner: FILID_ARTIFACT_OWNER,
        target,
      });
}
