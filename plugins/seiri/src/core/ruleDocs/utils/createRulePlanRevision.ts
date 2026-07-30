import { createHash } from 'node:crypto';

import type { RuleDocumentPlan } from '@ogham/agent-artifacts';

export function createRulePlanRevision(plan: RuleDocumentPlan): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        documents: plan.request.documents,
        desired: [...plan.request.desired].sort(),
        replaceDrift: [...plan.request.replaceDrift].sort(),
        revisions: plan.revisions,
      }),
    )
    .digest('hex');
}
