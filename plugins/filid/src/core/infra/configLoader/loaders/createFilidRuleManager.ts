import {
  type RuleDocumentManager,
  createRuleDocumentManager,
} from '@ogham/agent-artifacts/rules';

import { resolveFilidRuleTarget } from './resolveFilidRuleTarget.js';

export function createFilidRuleManager(
  projectRoot: string,
): RuleDocumentManager | null {
  const target = resolveFilidRuleTarget(projectRoot);
  return target === null
    ? null
    : createRuleDocumentManager({
        owner: 'filid',
        target,
      });
}
