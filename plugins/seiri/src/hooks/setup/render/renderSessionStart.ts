import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import { describeDial } from '../../../core/infra/configLoader/utils/describeDial.js';
import type { InterventionState } from '../../../types/config.js';
import type { RuleDocStatus } from '../../../types/manifest.js';
import type { WorkflowBinding } from '../../../types/workflow.js';
import { renderProgressLine } from '../../shared/progressLine/renderProgressLine.js';

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
  /** This actor's own active binding, read lock-free at `compact`; absent at every other source. */
  binding?: WorkflowBinding;
}

/**
 * Compose SessionStart's standard/strict injection, in a fixed order: an
 * active-rule summary and drift warning when rule status is available,
 * the effective dial, the election line, the chain line, at strict only
 * the posture line, and last — only when `binding` is given — the
 * progress line naming its task, intent and chain position. A missing or
 * unreadable `ruleStatuses` omits only the rule-summary lines; election,
 * chain and posture still render.
 * @param input Dial, optional rule statuses, the fixed election/chain/posture
 *   text, and this actor's own binding when one is active at `compact`.
 * @returns Ordered `additionalContext` lines, each already prefixed.
 */
export function renderSessionStart({
  dial,
  ruleStatuses,
  election,
  chain,
  posture,
  binding,
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
  if (binding)
    lines.push(renderProgressLine(binding.task, binding.intent, binding.step));

  return lines;
}
