import {
  LEDGER_OWNER_MANY,
  LEDGER_OWNER_ONE,
} from '../../../constants/gatesLines.js';
import type { TaskLedgerStatus } from '../../../types/gates.js';

/**
 * Render at most one workflow reminder for all open task ledgers.
 *
 * @param statuses Task-ledger summaries in display order.
 * @returns Single or multi-task reminder, or `undefined` when all are resolved.
 */
export function renderLedgerReminder(
  statuses: TaskLedgerStatus[],
): string | undefined {
  const open = statuses.filter((status) => status.unmet > 0);
  if (open.length === 0) return undefined;
  if (open.length === 1) {
    const status = open[0];
    if (status === undefined) return undefined;
    const abandoned = status.abandoned ? `, ${status.abandoned} abandoned` : '';
    return `Ledger ${status.task}: ${status.met}/${status.total} met${abandoned} — next ${status.next}; ${LEDGER_OWNER_ONE}`;
  }
  return `Ledgers: ${open
    .map((status) => `${status.task} ${status.met}/${status.total}`)
    .join(', ')} — ${LEDGER_OWNER_MANY}`;
}
