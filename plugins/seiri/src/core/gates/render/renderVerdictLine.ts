import { AGENT_MARKER_CHARS } from '../../../constants/gates.js';
import {
  AGENT_MET_HINT,
  UNOBSERVABLE_HINT,
} from '../../../constants/gatesLines.js';
import type { RecordedVerdict } from '../../../types/gates.js';

/**
 * Render recorded gate verdicts as one compact hook-injection line.
 *
 * @param results Recorded task verdicts for one command invocation.
 * @param opts Optional agent provenance and failure-chain suffix.
 * @returns One unprefixed verdict line, or an empty string for no results.
 */
export function renderVerdictLine(
  results: RecordedVerdict[],
  opts: {
    /** Harness agent identifier attached to a delegated invocation. */
    agentId?: string;
    /** Failure-chain ownership text appended once to the complete line. */
    chainHint?: string;
  },
): string {
  let line = '';
  const first = results[0];
  const combineMet =
    !opts.agentId &&
    results.length > 1 &&
    first !== undefined &&
    first.verdict.kind === 'met' &&
    results.every(
      (result) =>
        result.gate.id === first.gate.id && result.verdict.kind === 'met',
    );

  if (combineMet && first !== undefined) {
    line = `${first.gate.id} met in ${results
      .map((result) => result.task)
      .join(', ')} — evidence recorded`;
  } else {
    const fragments: string[] = [];
    for (const result of results) {
      const prefix = `${result.task} ${result.gate.id}`;
      if (result.verdict.kind === 'met') {
        if (opts.agentId)
          fragments.push(
            `${prefix} met via agent ${opts.agentId.slice(0, AGENT_MARKER_CHARS)} — ${AGENT_MET_HINT}`,
          );
        else if (result.verdict.channel === 'stderr')
          fragments.push(
            `${prefix} met — matched on stderr (exit ${result.verdict.exit ?? 'non-zero'} by design)`,
          );
        else
          fragments.push(
            `${prefix} met — evidence recorded (${result.status.met}/${result.status.total}, ${result.status.next ? `next ${result.status.next}` : 'all met'})`,
          );
      } else if (result.verdict.kind === 'unmet') {
        fragments.push(
          `${prefix} unmet — ${result.verdict.reason}${result.verdict.regressed ? ' (was met — regressed)' : ''}`,
        );
      } else {
        fragments.push(`${prefix} unobservable — ${UNOBSERVABLE_HINT}`);
      }
    }
    line = fragments.join('; ');
  }

  if (line !== '' && opts.chainHint) line += ` (${opts.chainHint})`;
  return line;
}
