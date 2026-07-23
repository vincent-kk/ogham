import { INTERVENTION_LEVELS } from '../../../../constants/intervention.js';
import {
  clearRuntime,
  describeDial,
  isInterventionLevel,
  loadIntervention,
  renderPostureLines,
  writeRuntime,
} from '../../../../core/infra/configLoader/index.js';
import type { InterventionState } from '../../../../types/config.js';

/** What a `config` call does: read the dial, turn the valve, or drop it. */
export type ConfigOp = 'get' | 'set' | 'clear';

export interface ConfigActionResult {
  action: 'config';
  op: ConfigOp;
  /** Whether this call altered stored state. */
  changed: boolean;
  dial: InterventionState;
  /**
   * The posture now in effect, as one sentence.
   *
   * This is the point of the field: the tool result is itself the context
   * the session reads, so a dial the user just moved takes effect in the
   * same turn instead of waiting for the next SessionStart render.
   */
  posture: string;
}

/**
 * Read or move the session valve.
 *
 * Only the valve. The committed baseline stays a setup-surface act, so
 * that lowering intervention mid-session can never quietly rewrite what
 * the repository declares to everyone else.
 */
export function applyConfigAction(
  projectRoot: string,
  op: ConfigOp,
  intervention: unknown,
): ConfigActionResult {
  let changed = false;

  if (op === 'set') {
    if (!isInterventionLevel(intervention))
      throw new Error(
        `config_op "set" needs "intervention" to be one of ${INTERVENTION_LEVELS.join(
          ' | ',
        )}; received ${JSON.stringify(intervention)}`,
      );
    writeRuntime(projectRoot, intervention);
    changed = true;
  }

  if (op === 'clear') changed = clearRuntime(projectRoot);

  const dial = loadIntervention(projectRoot);
  return {
    action: 'config',
    op,
    changed,
    dial,
    posture: [describeDial(dial), ...renderPostureLines(dial.effective)].join(
      ' ',
    ),
  };
}
