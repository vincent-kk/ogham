import { getDefaultAdapterIds } from '../../../../adapters/index.js';
import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import { BUILTIN_RULE_SEVERITIES } from '../../../../constants/builtinRuleSeverities.js';

import type { FilidConfig } from './configSchemas.js';

export function createDefaultConfig(
  language?: string,
  adapterIds?: string[],
): FilidConfig {
  if (adapterIds?.length === 0)
    throw new Error('explicit adapter mode requires at least one enabled ID');
  const rules = Object.fromEntries(
    Object.values(BUILTIN_RULE_IDS).map((ruleId) => [
      ruleId,
      { enabled: true, severity: BUILTIN_RULE_SEVERITIES[ruleId] },
    ]),
  ) as FilidConfig['rules'];
  return {
    version: '2.0',
    ...(language ? { language } : {}),
    adapters: {
      mode: adapterIds ? 'explicit' : 'auto',
      enabled: adapterIds ?? getDefaultAdapterIds(),
    },
    rules,
  };
}
