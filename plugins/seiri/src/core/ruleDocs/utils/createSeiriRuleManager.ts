import {
  type RuleDocumentManager,
  createRuleDocumentManager,
} from '@ogham/agent-artifacts/rules';

import { resolveSeiriRuleTarget } from './resolveSeiriRuleTarget.js';

export function createSeiriRuleManager(
  projectRoot: string,
): RuleDocumentManager | null {
  const target = resolveSeiriRuleTarget(projectRoot);
  if (target === null) return null;

  return createRuleDocumentManager({
    owner: 'seiri',
    target,
  });
}
