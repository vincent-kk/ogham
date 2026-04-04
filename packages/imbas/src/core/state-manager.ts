/**
 * @file core/state-manager.ts
 * @description State.json CRUD + transition validation
 * @see skills/validate/references/state-transitions.md, skills/split/references/state-transitions.md
 */

import { join } from 'node:path';
import { readJson, writeJson } from '../lib/file-io.js';
import { STATE_FILENAME, PHASE_ORDER } from '../constants/index.js';
import {
  RunStateSchema,
  createInitialRunState,
} from '../types/state.js';
import type { RunState, RunTransition, PhaseName } from '../types/state.js';

/** Create a new initial RunState (delegates to factory in types) */
export function createRunState(params: {
  run_id: string;
  project_ref: string;
  source_file: string;
}): RunState {
  return createInitialRunState(params);
}

/** Load and validate state.json from runDir */
export async function loadRunState(runDir: string): Promise<RunState> {
  return readJson(join(runDir, STATE_FILENAME), RunStateSchema);
}

/** Atomically write state.json to runDir */
export async function saveRunState(runDir: string, state: RunState): Promise<void> {
  await writeJson(join(runDir, STATE_FILENAME), state);
}

/** Apply a validated transition to the state, returning the new state */
export function applyTransition(state: RunState, action: RunTransition): RunState {
  const now = new Date().toISOString();

  switch (action.action) {
    case 'start_phase': {
      validateStartPhase(state, action.phase);
      const updated = structuredClone(state);
      updated.current_phase = action.phase;
      updated.phases[action.phase].status = 'in_progress';
      updated.phases[action.phase].started_at = now;
      updated.updated_at = now;
      return updated;
    }

    case 'complete_phase': {
      const phase = action.phase;
      if (state.phases[phase].status !== 'in_progress') {
        throw new Error(
          `Cannot complete phase "${phase}": current status is "${state.phases[phase].status}", expected "in_progress"`,
        );
      }
      const updated = structuredClone(state);
      updated.phases[phase].status = 'completed';
      updated.phases[phase].completed_at = now;
      updated.updated_at = now;

      // Apply phase-specific fields
      if (phase === 'validate') {
        if (action.result !== undefined) {
          updated.phases.validate.result = action.result;
        }
        if (action.blocking_issues !== undefined) {
          updated.phases.validate.blocking_issues = action.blocking_issues;
        }
        if (action.warning_issues !== undefined) {
          updated.phases.validate.warning_issues = action.warning_issues;
        }
      } else if (phase === 'split') {
        if (action.stories_created !== undefined) {
          updated.phases.split.stories_created = action.stories_created;
        }
        if (action.pending_review !== undefined) {
          updated.phases.split.pending_review = action.pending_review;
        }
      } else if (phase === 'devplan') {
        if (action.pending_review !== undefined) {
          updated.phases.devplan.pending_review = action.pending_review;
        }
      }

      // Advance current_phase to next
      updated.current_phase = advancePhase(phase);
      return updated;
    }

    case 'escape_phase': {
      const phase = action.phase; // always 'split'
      if (state.phases[phase].status !== 'in_progress') {
        throw new Error(
          `Cannot escape phase "${phase}": current status is "${state.phases[phase].status}", expected "in_progress"`,
        );
      }
      const updated = structuredClone(state);
      updated.phases.split.status = 'escaped';
      updated.phases.split.completed_at = now;
      updated.phases.split.escape_code = action.escape_code;
      updated.updated_at = now;
      return updated;
    }

    case 'skip_phases': {
      const updated = structuredClone(state);
      for (const phase of action.phases) {
        updated.phases[phase].status = 'completed';
        updated.phases[phase].completed_at = now;
        if (phase === 'validate') {
          updated.phases.validate.result = 'PASS';
          updated.phases.validate.blocking_issues = 0;
          updated.phases.validate.warning_issues = 0;
        }
        if (phase === 'split') {
          updated.phases.split.pending_review = false;
          updated.phases.split.stories_created = 0;
        }
      }
      const lastSkipped = action.phases[action.phases.length - 1]!;
      updated.current_phase = advancePhase(lastSkipped);
      updated.metadata = { ...updated.metadata, skipped_phases: action.phases };
      updated.updated_at = now;
      return updated;
    }

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

// --- Helpers ---

function validateStartPhase(state: RunState, phase: PhaseName): void {
  if (phase === 'validate') {
    // always allowed
    return;
  }

  if (phase === 'split') {
    const validate = state.phases.validate;
    if (validate.status !== 'completed') {
      throw new Error(
        `Cannot start phase "split": validate phase status is "${validate.status}", expected "completed"`,
      );
    }
    if (
      validate.result !== 'PASS' &&
      validate.result !== 'PASS_WITH_WARNINGS'
    ) {
      throw new Error(
        `Cannot start phase "split": validate result is "${validate.result}", expected PASS or PASS_WITH_WARNINGS`,
      );
    }
    return;
  }

  if (phase === 'devplan') {
    const split = state.phases.split;
    const normalPath =
      split.status === 'completed' && !split.pending_review;
    const escapePath =
      split.status === 'escaped' && split.escape_code === 'E2-3';

    if (!normalPath && !escapePath) {
      throw new Error(
        `Cannot start phase "devplan": split status is "${split.status}", ` +
          `pending_review=${split.pending_review}, escape_code=${split.escape_code}. ` +
          `Expected: split completed+not pending_review, or split escaped with E2-3`,
      );
    }
    return;
  }
}

function advancePhase(current: PhaseName): PhaseName {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx < PHASE_ORDER.length - 1) {
    return PHASE_ORDER[idx + 1]!;
  }
  return current;
}
