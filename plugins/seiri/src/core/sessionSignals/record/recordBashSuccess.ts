import { readSignals } from '../store/readSignals.js';
import { writeSignals } from '../store/writeSignals.js';
import { hashCommand } from '../utils/hashCommand.js';

/**
 * Forget the chain for `command` — it went green.
 *
 * Only this command's counter. A red-then-green loop on one command must
 * not be reset by an unrelated `git status` succeeding in between, and a
 * command that has genuinely started passing is no longer evidence of
 * anything. Nothing is written when there was no chain to forget, which
 * keeps a project that never fails from acquiring a state file at all.
 */
export function recordBashSuccess(
  projectRoot: string,
  sessionId: string,
  command: string,
): void {
  const signals = readSignals(projectRoot, sessionId);
  const hash = hashCommand(command);
  if (signals.counts[hash] === undefined) return;

  delete signals.counts[hash];
  writeSignals(projectRoot, signals);
}
