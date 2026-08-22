import type {
  GateState,
  GateStatus,
  GatesLedger,
  TaskLedgerStatus,
} from '../../../types/gates.js';
import { isAgentEvidence } from '../utils/isAgentEvidence.js';

/**
 * Aggregate one parsed ledger into task and optional gate-level status.
 *
 * @param task Owning task name.
 * @param path Absolute ledger path.
 * @param ledger Parsed ledger snapshot.
 * @param opts Optional detail controls.
 * @returns Counts, next work, abandonments, provenance, and optional gates.
 */
export function computeLedgerStatus(
  task: string,
  path: string,
  ledger: GatesLedger,
  opts: {
    /** Include the per-gate status projection. */
    gates?: boolean;
  } = {},
): TaskLedgerStatus {
  const abandonedIds = new Set(ledger.abandons.map((entry) => entry.id));
  const gates: GateStatus[] = [];
  const unmetGates: TaskLedgerStatus['unmet_gates'] = [];
  const metByAgent: string[] = [];
  let met = 0;
  let unmet = 0;
  let abandoned = 0;

  for (const gate of ledger.gates) {
    const state: GateState = abandonedIds.has(gate.id)
      ? 'abandoned'
      : gate.checked && !gate.evidence.startsWith('pending')
        ? 'met'
        : 'unmet';
    const byAgent = state === 'met' && isAgentEvidence(gate.evidence);
    if (state === 'met') met += 1;
    if (state === 'unmet') {
      unmet += 1;
      unmetGates.push({
        id: gate.id,
        title: gate.title,
        ...(gate.check === undefined ? {} : { check: gate.check }),
      });
    }
    if (state === 'abandoned') abandoned += 1;
    if (byAgent) metByAgent.push(gate.id);
    gates.push({
      id: gate.id,
      title: gate.title,
      group: gate.group,
      state,
      ...(gate.check === undefined ? {} : { check: gate.check }),
      ...(gate.expect === undefined ? {} : { expect: gate.expect }),
      evidence: gate.evidence,
      byAgent,
    });
  }

  const next = unmetGates[0]?.id;
  return {
    task,
    path,
    total: ledger.gates.length,
    met,
    unmet,
    abandoned,
    all_met: unmet === 0,
    ...(next === undefined ? {} : { next }),
    unmet_gates: unmetGates,
    abandons: ledger.abandons.map(({ id, reason }) => ({ id, reason })),
    met_by_agent: metByAgent,
    ...(opts.gates ? { gates } : {}),
  };
}
