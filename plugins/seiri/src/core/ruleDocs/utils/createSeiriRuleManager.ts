import {
  type RuleDocumentManager,
  createRuleDocumentManager,
} from '@ogham/agent-artifacts/rules';

import type { SeiriConfigScope } from '../../../types/config.js';

import { resolveSeiriRuleTarget } from './resolveSeiriRuleTarget.js';

/**
 * Rule document manager bound to one layer's channel.
 *
 * @param projectRoot Anchor for the project channel.
 * @param scope Which layer's channel to manage; `project` by default so a
 *   caller that has not been taught about layers keeps its old behavior.
 * @returns The manager, or `null` when the runtime host has no rule channel.
 */
export function createSeiriRuleManager(
  projectRoot: string,
  scope: SeiriConfigScope = 'project',
): RuleDocumentManager | null {
  const target = resolveSeiriRuleTarget(projectRoot, scope);
  if (target === null) return null;

  return createRuleDocumentManager({
    owner: 'seiri',
    target,
  });
}
