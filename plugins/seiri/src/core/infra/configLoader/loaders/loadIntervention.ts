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
import { configLayers } from '../utils/configLayers.js';
import { readDialFile } from '../utils/readDialFile.js';
import { resolveRuntimePath } from '../utils/resolveRuntimePath.js';

const USER_LABEL = `user ${CONFIG_FILE}`;
const BASELINE_LABEL = `${CONFIG_DIR}/${CONFIG_FILE}`;
const RUNTIME_LABEL = `${CONFIG_DIR}/${RUNTIME_FILE}`;

/**
 * Resolve the dial across all three stored layers. Never throws.
 *
 * Precedence is `runtime > project > user > default`. The valve wins so
 * that lowering intervention for one session costs a tool call rather than
 * a commit; the project layer wins over the user layer so a team's
 * committed decision outranks a personal default. Every hook recomputes
 * this per run, which is why a change lands without restarting anything.
 *
 * Layers are read separately rather than merged. The dial is a single key,
 * so a merged document would say nothing the `??` chain does not — and what
 * the render actually needs is which layer supplied the value. A dial that
 * changed with no visible owner reads as the repository changing its mind
 * on its own.
 *
 * A damaged layer is skipped rather than fatal, and named in `warnings`.
 */
export function loadIntervention(projectRoot: string): InterventionState {
  const warnings: InterventionWarning[] = [];
  const layers = configLayers(projectRoot);

  const user = readDialFile(layers.user);
  if (user.reason) warnings.push({ file: USER_LABEL, reason: user.reason });

  const baseline = readDialFile(layers.project as string);
  if (baseline.reason)
    warnings.push({ file: BASELINE_LABEL, reason: baseline.reason });

  const runtime = readDialFile(resolveRuntimePath(projectRoot));
  if (runtime.reason)
    warnings.push({ file: RUNTIME_LABEL, reason: runtime.reason });

  let source: InterventionSource = 'default';
  if (runtime.intervention !== null) source = 'runtime';
  else if (baseline.intervention !== null) source = 'baseline';
  else if (user.intervention !== null) source = 'user';

  return {
    effective:
      runtime.intervention ??
      baseline.intervention ??
      user.intervention ??
      DEFAULT_INTERVENTION,
    source,
    baseline: baseline.intervention,
    user: user.intervention,
    runtime: runtime.intervention,
    warnings,
  };
}
