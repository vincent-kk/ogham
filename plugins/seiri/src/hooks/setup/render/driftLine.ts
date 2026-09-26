import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import type { RuleDocStatus } from '../../../types/manifest.js';

import { shortRuleName } from './shortRuleName.js';

const SETUP_COMMAND = '/seiri:setup';

/**
 * One line naming every active rule whose deployed bytes drifted from the
 * shipped template, or `undefined` when none did.
 * @param active Active rule statuses to check for drift.
 * @returns The drift line, or `undefined` when nothing drifted.
 */
export function driftLine(active: RuleDocStatus[]): string | undefined {
  const drifted = active.filter((status) => !status.activeInSync);
  if (drifted.length === 0) return undefined;
  const names = drifted.map((status) => shortRuleName(status.id)).join(', ');
  return `${INJECTION_PREFIX} ${drifted.length} rule(s) differ from the shipped template: ${names}. Run ${SETUP_COMMAND} to review.`;
}
