import type { RuleOverride } from '../../../../types/rules.js';
import { loadConfig } from './load-config.js';

/** Read rule overrides from .filid/config.json. Returns empty object if no config. */
export function loadRuleOverrides(
  projectRoot: string,
): Record<string, RuleOverride> {
  const { config } = loadConfig(projectRoot);
  return config?.rules ?? {};
}
