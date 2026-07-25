import { INJECTION_PREFIX } from '../../constants/plugin.js';
import type { RuleDocStatus } from '../../types/manifest.js';

import { ruleChannelLabel } from './ruleChannelLabel.js';
import { shortRuleName } from './shortRuleName.js';

/** Which rules this repository turned on, counted against the manifest. */
export function activeRulesLine(
  active: RuleDocStatus[],
  total: number,
): string {
  const names = active.map((status) => shortRuleName(status.id)).join(', ');
  return `${INJECTION_PREFIX} Active rules: ${names} (${active.length}/${total}) — ${ruleChannelLabel(active)}`;
}
