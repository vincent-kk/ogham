import {
  AGENT_MARKER_CHARS,
  EVIDENCE_MAX_CHARS,
  EVIDENCE_REGRESSED,
} from '../../../constants/gates.js';
import type { CheckOutcome, RecordedVerdict } from '../../../types/gates.js';
import { hashCommand } from '../../utils/hashCommand.js';
import { parseGatesLedger } from '../parse/parseGatesLedger.js';
import { computeLedgerStatus } from '../status/computeLedgerStatus.js';
import { listTaskLedgers } from '../store/listTaskLedgers.js';
import { readTaskLedger } from '../store/readTaskLedger.js';
import { withGatesLock } from '../store/withGatesLock.js';
import { writeLedgerLines } from '../store/writeLedgerLines.js';
import { applyGateLines } from '../utils/applyGateLines.js';

import { judgeCheckOutcome } from './judgeCheckOutcome.js';

/** Exit suffix retained ahead of a final agent marker. */
const EXIT_SUFFIX = / (\(exit [^)]+\))$/;

/**
 * Fit an excerpt and required suffixes within the final evidence cap.
 *
 * @param excerpt Evidence text that may be truncated.
 * @param suffix Complete suffix text that must remain intact.
 * @returns Capped evidence with an ellipsis when truncation was required.
 */
function capWithSuffix(excerpt: string, suffix: string): string {
  if (excerpt.length + suffix.length <= EVIDENCE_MAX_CHARS)
    return `${excerpt}${suffix}`;
  const kept = Math.max(0, EVIDENCE_MAX_CHARS - suffix.length - 1);
  return `${excerpt.slice(0, kept)}…${suffix}`;
}

/**
 * Add delegated provenance while preserving all suffixes inside the cap.
 *
 * @param evidence Capped evidence with an optional exit suffix.
 * @param agentId Optional harness agent identifier.
 * @returns Evidence with a final truncated agent marker when supplied.
 */
function markAgentEvidence(
  evidence: string,
  agentId: string | undefined,
): string {
  if (!agentId) return evidence;
  const marker = ` (via agent ${agentId.slice(0, AGENT_MARKER_CHARS)})`;
  const exit = EXIT_SUFFIX.exec(evidence)?.[0] ?? '';
  const excerpt = exit === '' ? evidence : evidence.slice(0, -exit.length);
  const suffix = `${exit}${marker}`;
  return capWithSuffix(excerpt, suffix);
}

/**
 * Judge and record every task gate whose normalized CHECK matches a command.
 *
 * @param projectRoot Any path inside the owning repository.
 * @param command Executed command text.
 * @param outcome Observable tool result.
 * @param agentId Optional delegated-agent provenance.
 * @returns One verdict per current matching gate, in task and source order.
 */
export function recordCheckOutcome(
  projectRoot: string,
  command: string,
  outcome: CheckOutcome,
  agentId?: string,
): RecordedVerdict[] {
  const commandHash = hashCommand(command);
  const results: RecordedVerdict[] = [];

  for (const candidate of listTaskLedgers(projectRoot)) {
    const initiallyMatches = candidate.ledger.gates.some(
      (gate) =>
        gate.check !== undefined && hashCommand(gate.check) === commandHash,
    );
    if (!initiallyMatches) continue;

    try {
      const recorded = withGatesLock(candidate.dir, () => {
        const current = readTaskLedger(projectRoot, candidate.task);
        if (current === undefined) return [];
        const judged = current.ledger.gates
          .filter(
            (gate) =>
              gate.check !== undefined &&
              hashCommand(gate.check) === commandHash,
          )
          .map((gate) => ({
            gate,
            ...judgeCheckOutcome(gate, outcome),
          }));
        if (judged.length === 0) return [];

        let lines = current.ledger.lines;
        let changed = false;
        const descending = [...judged].sort(
          (left, right) => right.gate.line - left.gate.line,
        );
        for (const result of descending)
          if (result.verdict.kind === 'met') {
            const evidence = markAgentEvidence(result.evidence ?? '', agentId);
            if (!result.gate.checked || result.gate.evidence !== evidence) {
              lines = applyGateLines(lines, result.gate, {
                checked: true,
                evidence,
              });
              changed = true;
            }
          } else if (
            result.verdict.kind === 'unmet' &&
            result.verdict.regressed
          ) {
            lines = applyGateLines(lines, result.gate, {
              checked: false,
              evidence: EVIDENCE_REGRESSED,
            });
            changed = true;
          }

        if (changed) writeLedgerLines(current.path, lines);
        const ledger = changed
          ? parseGatesLedger(lines.join('\n'))
          : current.ledger;
        const status = computeLedgerStatus(
          candidate.task,
          current.path,
          ledger,
        );
        return judged.map(({ gate, verdict }) => ({
          task: candidate.task,
          gate,
          verdict,
          status,
        }));
      });
      results.push(...recorded);
    } catch {
      // One unreadable or unwritable ledger does not suppress other tasks.
    }
  }

  return results;
}
