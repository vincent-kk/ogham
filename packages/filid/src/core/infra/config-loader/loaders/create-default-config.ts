import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { FilidConfig } from './config-schemas.js';

/** Generate the default initial config with all 8 built-in rules. */
export function createDefaultConfig(): FilidConfig {
  return {
    version: '1.0',
    rules: {
      [BUILTIN_RULE_IDS.NAMING_CONVENTION]: {
        enabled: true,
        severity: 'warning',
      },
      [BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD]: {
        enabled: true,
        severity: 'error',
      },
      [BUILTIN_RULE_IDS.INDEX_BARREL_PATTERN]: {
        enabled: true,
        severity: 'warning',
      },
      [BUILTIN_RULE_IDS.MODULE_ENTRY_POINT]: {
        enabled: true,
        severity: 'warning',
      },
      [BUILTIN_RULE_IDS.MAX_DEPTH]: { enabled: true, severity: 'error' },
      [BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY]: {
        enabled: true,
        severity: 'error',
      },
      [BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION]: {
        enabled: true,
        severity: 'error',
      },
      [BUILTIN_RULE_IDS.ZERO_PEER_FILE]: { enabled: true, severity: 'warning' },
    },
  };
}
