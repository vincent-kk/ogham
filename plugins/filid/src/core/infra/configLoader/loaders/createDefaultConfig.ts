import { getDefaultAdapterIds } from '../../../../adapters/index.js';
import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';

import type { FilidConfig } from './configSchemas.js';

const ERROR_RULE_IDS = new Set([
  'circular-dependency',
  'detail-document-contract',
  'intent-document-contract',
  'max-depth',
  'organ-no-intentmd',
  'pure-function-isolation',
  'spec-contract-link',
  'spec-document-case-cap',
  'spec-fragmentation',
  'test-record-case-cap',
]);

export function createDefaultConfig(
  language?: string,
  adapterIds?: string[],
): FilidConfig {
  if (adapterIds?.length === 0)
    throw new Error('explicit adapter mode requires at least one enabled ID');
  const rules = Object.fromEntries(
    Object.values(BUILTIN_RULE_IDS).map((ruleId) => [
      ruleId,
      {
        enabled: true,
        severity: ERROR_RULE_IDS.has(ruleId) ? 'error' : 'warning',
      },
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
