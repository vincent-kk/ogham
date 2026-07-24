import {
  CONFIG_DIR,
  CONFIG_FILE,
  RUNTIME_FILE,
} from '../../../../constants/files.js';
import { DEFAULT_INTERVENTION } from '../../../../constants/intervention.js';
import type {
  InterventionSource,
  InterventionState,
  InterventionWarning,
} from '../../../../types/config.js';
import { readDialFile } from '../utils/readDialFile.js';
import { resolveConfigPath } from '../utils/resolveConfigPath.js';
import { resolveRuntimePath } from '../utils/resolveRuntimePath.js';

const BASELINE_LABEL = `${CONFIG_DIR}/${CONFIG_FILE}`;
const RUNTIME_LABEL = `${CONFIG_DIR}/${RUNTIME_FILE}`;

/**
 * Resolve the dial across both stored layers. Never throws.
 *
 * The valve wins over the baseline, and the baseline over the default, so
 * that lowering intervention for one session costs a tool call rather
 * than a commit. Every hook recomputes this per run, which is why a
 * change lands without restarting anything.
 *
 * A damaged layer is skipped rather than fatal, and named in `warnings`:
 * falling back silently would show a dial nobody set as if someone had.
 */
export function loadIntervention(projectRoot: string): InterventionState {
  const warnings: InterventionWarning[] = [];

  const baseline = readDialFile(resolveConfigPath(projectRoot));
  if (baseline.reason)
    warnings.push({ file: BASELINE_LABEL, reason: baseline.reason });

  const runtime = readDialFile(resolveRuntimePath(projectRoot));
  if (runtime.reason)
    warnings.push({ file: RUNTIME_LABEL, reason: runtime.reason });

  let source: InterventionSource = 'default';
  if (runtime.intervention !== null) source = 'runtime';
  else if (baseline.intervention !== null) source = 'baseline';

  return {
    effective:
      runtime.intervention ?? baseline.intervention ?? DEFAULT_INTERVENTION,
    source,
    baseline: baseline.intervention,
    runtime: runtime.intervention,
    warnings,
  };
}
