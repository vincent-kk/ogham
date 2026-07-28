import type {
  LoadConfigResult,
  SeiriConfigScope,
} from '../../../../types/config.js';
import { configLayers } from '../utils/configLayers.js';
import { readDialFile } from '../utils/readDialFile.js';

/**
 * Read one stored dial layer — the committed project baseline by default,
 * or the personal user layer when asked.
 *
 * Never throws. A missing file is the normal state for a project that has
 * not run setup, and a damaged one must not take the session down — both
 * yield `config: null` and the caller falls back. The two cases are still
 * distinguishable: only the damaged one sets `warning`, so a render can
 * say the dial was ignored rather than silently showing `advisory`.
 *
 * This is one stored layer alone, which is what the settings page edits.
 * Anything that acts on the dial in effect wants `loadIntervention`,
 * because a session valve and the other layer may be outranking it.
 */
export function loadConfig(
  projectRoot: string,
  scope: SeiriConfigScope = 'project',
): LoadConfigResult {
  const layers = configLayers(projectRoot);
  const path = scope === 'user' ? layers.user : (layers.project as string);
  const { intervention, reason } = readDialFile(path);

  if (intervention !== null) return { config: { intervention }, path };
  return reason
    ? { config: null, path, warning: reason }
    : { config: null, path };
}
