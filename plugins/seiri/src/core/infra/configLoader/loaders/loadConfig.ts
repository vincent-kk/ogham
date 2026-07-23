import type { LoadConfigResult } from '../../../../types/config.js';
import { readDialFile } from '../utils/readDialFile.js';
import { resolveConfigPath } from '../utils/resolveConfigPath.js';

/**
 * Read the committed baseline, `<repoRoot>/.seiri/config.json`.
 *
 * Never throws. A missing file is the normal state for a project that has
 * not run setup, and a damaged one must not take the session down with it
 * — both yield `config: null` and the caller falls back to defaults. The
 * two cases are still distinguishable: only the damaged one sets
 * `warning`, so a render can say the dial was ignored rather than
 * silently showing `advisory`.
 *
 * This is the baseline layer alone, which is what the settings page edits.
 * Anything that acts on the dial in effect wants `loadIntervention`,
 * because a session valve may be overriding what is stored here.
 */
export function loadConfig(projectRoot: string): LoadConfigResult {
  const path = resolveConfigPath(projectRoot);
  const { intervention, reason } = readDialFile(path);

  if (intervention !== null) return { config: { intervention }, path };
  return reason
    ? { config: null, path, warning: reason }
    : { config: null, path };
}
