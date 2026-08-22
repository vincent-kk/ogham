import { renderLedgerReminder } from '../../../core/gates/render/renderLedgerReminder.js';
import { computeLedgerStatus } from '../../../core/gates/status/computeLedgerStatus.js';
import { listTaskLedgers } from '../../../core/gates/store/listTaskLedgers.js';

/**
 * Render the current repository's open task ledgers without risking a turn.
 *
 * @param cwd Any path inside the repository whose ledgers should be summarized.
 * @returns One ledger reminder, or `undefined` when none is available.
 */
export function ledgerReminder(cwd: string): string | undefined {
  try {
    return renderLedgerReminder(
      listTaskLedgers(cwd).map(({ task, path, ledger }) =>
        computeLedgerStatus(task, path, ledger),
      ),
    );
  } catch {
    return undefined;
  }
}
