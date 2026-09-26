import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import { describeDial } from '../../../core/infra/configLoader/utils/describeDial.js';
import type { InterventionState } from '../../../types/config.js';
import type { RuleDocStatus } from '../../../types/manifest.js';

import { activeRulesLine } from './activeRulesLine.js';
import { driftLine } from './driftLine.js';

/** Inputs to a standard/strict SessionStart render; the caller has already filtered off/advisory out. */
export interface SessionStartRenderInput {
  /** Effective dial, described verbatim. */
  dial: InterventionState;
  /** Rule status snapshot, or `undefined` when the plugin root or manifest could not be read. */
  ruleStatuses?: RuleDocStatus[];
  /** Fixed election line for the effective dial. */
  election: string;
  /** Fixed one-line chain summary. */
  chain: string;
  /** Fixed strict posture line; omitted at standard. */
  posture?: string;
}

/**
 * Compose SessionStart's standard/strict injection, in a fixed order: an
 * active-rule summary and drift warning when rule status is available,
 * the effective dial, the election line, the chain line, and — at strict
 * only — the posture line. A missing or unreadable `ruleStatuses` omits
 * only the rule-summary lines; election, chain and posture still render.
 * @param input Dial, optional rule statuses, and the fixed election/chain/posture text.
 * @returns Ordered `additionalContext` lines, each already prefixed.
 */
export function renderSessionStart({
  dial,
  ruleStatuses,
  election,
  chain,
  posture,
}: SessionStartRenderInput): string[] {
  const active = ruleStatuses?.filter((status) => status.active) ?? [];
  const lines: string[] = [];

  if (ruleStatuses && active.length > 0)
    lines.push(activeRulesLine(active, ruleStatuses.length));

  lines.push(`${INJECTION_PREFIX} ${describeDial(dial)}`);

  const drift = ruleStatuses ? driftLine(active) : undefined;
  if (drift) lines.push(drift);

  lines.push(`${INJECTION_PREFIX} ${election}`);
  lines.push(`${INJECTION_PREFIX} ${chain}`);
  if (posture) lines.push(`${INJECTION_PREFIX} ${posture}`);

  return lines;
}
