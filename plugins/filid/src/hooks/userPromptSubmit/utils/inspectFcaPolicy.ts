import {
  type RuleDocumentPresence,
  inspectTrustedRuleDocumentPresence,
  resolveProjectRuleTarget,
} from '@ogham/agent-artifacts';
import { resolveRuntimeHost } from '@ogham/cross-platform';

import {
  LEGACY_RULE_DOCS,
  PRIMARY_RULE_DOC,
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
      filename: PRIMARY_RULE_DOC,
      legacyFilenames: [...LEGACY_RULE_DOCS],
    },
  );
}
