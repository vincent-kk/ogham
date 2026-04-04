/**
 * @file devplan-result.test.ts
 * @description DevplanPhase.result field — complete_phase assignment + backward compat
 */

import { describe, expect, it } from 'vitest';

import { createRunState, applyTransition } from '../core/state-manager/state-manager.js';
import { RunStateSchema, type RunState } from '../types/state.js';

function freshState(): RunState {
  return createRunState({
    run_id: '20260405-001',
    project_ref: 'PROJ',
    source_file: 'req.md',
  });
}

function devplanInProgress(state: RunState): RunState {
  return {
    ...state,
    current_phase: 'devplan',
    phases: {
      ...state.phases,
      validate: { ...state.phases.validate, status: 'completed', result: 'PASS', completed_at: new Date().toISOString() },
      split: { ...state.phases.split, status: 'completed', pending_review: false, completed_at: new Date().toISOString() },
      devplan: { ...state.phases.devplan, status: 'in_progress', started_at: new Date().toISOString() },
    },
  };
}

describe('DevplanPhase.result', () => {
  it('createInitialRunState emits result: null for devplan', () => {
    const state = freshState();
    expect(state.phases.devplan.result).toBeNull();
  });

  it('complete_phase(devplan, result: "BLOCKED") persists BLOCKED into state', () => {
    const state = devplanInProgress(freshState());
    const updated = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: state.run_id,
      action: 'complete_phase',
      phase: 'devplan',
      result: 'BLOCKED',
      pending_review: false,
    });
    expect(updated.phases.devplan.status).toBe('completed');
    expect(updated.phases.devplan.result).toBe('BLOCKED');
  });

  it('legacy state.json lacking devplan.result loads with result: null via Zod default', () => {
    const legacyState = {
      run_id: '20260101-001',
      project_ref: 'PROJ',
      epic_ref: null,
      source_file: 'req.md',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      current_phase: 'devplan',
      phases: {
        validate: {
          status: 'completed',
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: '2026-01-01T00:00:00.000Z',
          output: 'validation-report.md',
          result: 'PASS',
          blocking_issues: 0,
          warning_issues: 0,
        },
        split: {
          status: 'completed',
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: '2026-01-01T00:00:00.000Z',
          output: 'stories-manifest.json',
          stories_created: 3,
          pending_review: false,
          escape_code: null,
        },
        devplan: {
          status: 'in_progress',
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: null,
          output: 'devplan-manifest.json',
          pending_review: true,
        },
      },
    };

    const parsed = RunStateSchema.parse(legacyState);
    expect(parsed.phases.devplan.result).toBeNull();
  });
});
