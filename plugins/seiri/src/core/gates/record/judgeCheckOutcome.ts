import type {
  CheckOutcome,
  GateEntry,
  GateVerdict,
} from '../../../types/gates.js';
import { excerptEvidence } from '../utils/excerptEvidence.js';
import { matchExpect } from '../utils/matchExpect.js';

/**
 * Judge one gate against the command channels a hook can observe.
 *
 * @param gate Current gate state and matching contract.
 * @param outcome Successful output or failed-command error payload.
 * @returns Verdict plus replacement evidence when proof was observed.
 */
export function judgeCheckOutcome(
  gate: GateEntry,
  outcome: CheckOutcome,
): { verdict: GateVerdict; evidence?: string } {
  const regressed = gate.checked && !gate.evidence.startsWith('pending');
  if (outcome.kind === 'success') {
    const text = `${outcome.stdout}\n${outcome.stderr}`;
    const match = matchExpect(gate.expect, text);
    if (match.matched)
      return {
        verdict: { kind: 'met', channel: 'output' },
        evidence: excerptEvidence(text, match.line, 0),
      };
    return {
      verdict: {
        kind: 'unmet',
        reason: `EXPECT "${gate.expect}" not in output`,
        regressed,
      },
    };
  }

  const exitLabel = outcome.exit ?? 'non-zero';
  if (gate.expect === undefined)
    return {
      verdict: { kind: 'unmet', reason: `exit ${exitLabel}`, regressed },
    };

  const match = matchExpect(gate.expect, outcome.error);
  if (match.matched) {
    const exit = outcome.exit ?? 1;
    return {
      verdict: { kind: 'met', channel: 'stderr', exit },
      evidence: excerptEvidence(outcome.error, match.line, exit),
    };
  }

  if (outcome.error.replace(/^Exit code \d+\s*/, '').trim() !== '')
    return {
      verdict: {
        kind: 'unmet',
        reason: `exit ${exitLabel}; EXPECT not in stderr`,
        regressed,
      },
    };
  return { verdict: { kind: 'unobservable' } };
}
