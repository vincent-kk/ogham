import { portableJoin } from '@ogham/cross-platform/compat';

import { SIGNALS_FILE } from '../../../constants/files.js';
import { TRACKED_COMMANDS_CAP } from '../../../constants/signals.js';
import type { SessionSignals } from '../../../types/signals.js';
import { ensureSeiriDir } from '../../utils/ensureSeiriDir.js';
import { writeAtomically } from '../../utils/writeAtomically.js';

/**
 * Persist this session's counters, oldest entries first to be dropped.
 *
 * The cap is what keeps a long session's scratchpad from becoming a log:
 * a command that fell out of the window cannot still be part of a
 * consecutive chain, so forgetting it loses nothing. Insertion order is
 * the eviction order, which is what a plain object already gives us for
 * string keys.
 */
export function writeSignals(
  projectRoot: string,
  signals: SessionSignals,
): void {
  const path = portableJoin(ensureSeiriDir(projectRoot), SIGNALS_FILE);
  writeAtomically(path, `${JSON.stringify(prune(signals))}\n`);
}

function prune(signals: SessionSignals): SessionSignals {
  const keys = Object.keys(signals.counts);
  if (keys.length <= TRACKED_COMMANDS_CAP) return signals;

  const kept = keys.slice(keys.length - TRACKED_COMMANDS_CAP);
  const counts: Record<string, number> = {};
  for (const key of kept) counts[key] = signals.counts[key] as number;

  return {
    ...signals,
    counts,
    announced: signals.announced.filter((hash) => kept.includes(hash)),
  };
}
