import {
  NO_EXPECT_HINT,
  NO_OUTPUT_REASON,
} from '../../../constants/gatesLines.js';
import type {
  CheckOutcome,
  GateEntry,
  GateVerdict,
} from '../../../types/gates.js';
import { excerptEvidence } from '../utils/excerptEvidence.js';
import { matchExpect } from '../utils/matchExpect.js';

/**
 * Decorate a reason only when a host exposed a non-zero exit.
 *
 * @param reason Host-neutral verdict reason.
 * @param exit Optional host-reported process exit.
 * @returns Reason with a non-zero exit suffix when known.
 */
function withKnownExit(reason: string, exit: number | undefined): string {
  return exit !== undefined && exit !== 0 ? `${reason} (exit ${exit})` : reason;
}

/**
 * Judge one gate against host-normalized command output.
 *
 * @param gate Current gate state and matching contract.
 * @param outcome Observable text with optional host metadata.
 * @returns Verdict plus replacement evidence when proof was observed.
 */
export function judgeCheckOutcome(
  gate: GateEntry,
  outcome: CheckOutcome,
): { verdict: GateVerdict; evidence?: string } {
  const regressed = gate.checked && !gate.evidence.startsWith('pending');
  if (gate.expect === undefined)
    return {
      verdict: {
        kind: 'unjudgeable',
        reason: NO_EXPECT_HINT,
        regressed,
      },
    };

  if (outcome.text.trim() === '')
    return {
      verdict: {
        kind: 'unmet',
        reason: withKnownExit(NO_OUTPUT_REASON, outcome.exit),
        regressed,
      },
    };

  const match = matchExpect(gate.expect, outcome.text);
  if (match.matched)
    return {
      verdict: {
        kind: 'met',
        ...(outcome.exit !== undefined && outcome.exit !== 0
          ? { exit: outcome.exit }
          : {}),
      },
      evidence: excerptEvidence(outcome.text, match.line, outcome.exit),
    };

  return {
    verdict: {
      kind: 'unmet',
      reason: withKnownExit(
        `EXPECT "${gate.expect}" not in output`,
        outcome.exit,
      ),
      regressed,
    },
  };
}
