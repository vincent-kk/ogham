import {
  type RuleDocumentPresence,
  inspectTrustedRuleDocumentPresence,
} from '@ogham/agent-artifacts/rules/presence/trusted';
import { resolveProjectRuleTarget } from '@ogham/agent-artifacts/targets/project/rules';
import { resolveRuntimeHost } from '@ogham/cross-platform/host-registry/runtime';

import {
  FCA_POLICY_RULE_DOC,
  LEGACY_FCA_POLICY_RULE_DOC,
} from '../../../constants/ruleDocs.js';

export function inspectFcaPolicy(
  projectRoot: string,
): RuleDocumentPresence | null {
  const runtimeHost = resolveRuntimeHost(process.env);
  if (runtimeHost === 'unknown') return null;
  const host = runtimeHost === 'codex' ? 'codex' : 'claude';
  const target = resolveProjectRuleTarget({ host, projectRoot });

  return inspectTrustedRuleDocumentPresence(
    { owner: 'filid', target },
    {
      filename: FCA_POLICY_RULE_DOC,
      legacyFilenames: [LEGACY_FCA_POLICY_RULE_DOC],
    },
  );
}
