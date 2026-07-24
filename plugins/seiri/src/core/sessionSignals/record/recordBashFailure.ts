import { FAILURE_CHAIN_THRESHOLD } from '../../../constants/signals.js';
import { readSignals } from '../store/readSignals.js';
import { writeSignals } from '../store/writeSignals.js';
import { hashCommand } from '../utils/hashCommand.js';

/**
 * Count one failure of `command`, and answer whether this is the moment
 * to say something about it.
 *
 * True at most once per command per session. A chain that keeps failing
 * after the first mention has already been told; repeating it would turn
 * a suggestion into nagging, which is the failure mode that gets a signal
 * tuned out rather than acted on.
 */
export function recordBashFailure(
  projectRoot: string,
  sessionId: string,
  command: string,
): boolean {
  const signals = readSignals(projectRoot, sessionId);
  const hash = hashCommand(command);
  const count = (signals.counts[hash] ?? 0) + 1;
  signals.counts[hash] = count;

  const announce =
    count >= FAILURE_CHAIN_THRESHOLD && !signals.announced.includes(hash);
  if (announce) signals.announced.push(hash);

  writeSignals(projectRoot, signals);
  return announce;
}
