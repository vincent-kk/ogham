import { describe, expect, it } from 'vitest';

import {
  EscapeCodeSchema,
  PhaseStatusSchema,
  RunStateSchema,
  RunTransitionSchema,
} from '../types/state.js';

// --- RunStateSchema ---

describe('RunStateSchema', () => {
  const validState = {
    run_id: '20240101-001',
    project_ref: 'PROJ',
    epic_ref: null,
    source_file: 'requirements.md',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    current_phase: 'validate',
    phases: {
      validate: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'validation-report.md',
        result: null,
        blocking_issues: 0,
        warning_issues: 0,
      },
      split: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'stories-manifest.json',
        stories_created: 0,
        pending_review: true,
        escape_code: null,
      },
      devplan: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'devplan-manifest.json',
        pending_review: true,
      },
    },
  };

  it('parses valid state', () => {
    const result = RunStateSchema.safeParse(validState);
    expect(result.success).toBe(true);
  });

  it('rejects invalid phase status', () => {
    const bad = {
      ...validState,
      phases: {
        ...validState.phases,
        validate: { ...validState.phases.validate, status: 'unknown_status' },
      },
    };
    const result = RunStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid current_phase', () => {
    const bad = { ...validState, current_phase: 'nonexistent' };
    const result = RunStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid validate result value', () => {
    const bad = {
      ...validState,
      phases: {
        ...validState.phases,
        validate: { ...validState.phases.validate, result: 'INVALID_RESULT' },
      },
    };
    const result = RunStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid escape_code', () => {
    const bad = {
      ...validState,
      phases: {
        ...validState.phases,
        split: { ...validState.phases.split, escape_code: 'X9-9' },
      },
    };
    const result = RunStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('accepts all valid EscapeCode values', () => {
    for (const code of ['E2-1', 'E2-2', 'E2-3', 'EC-1', 'EC-2'] as const) {
      const result = EscapeCodeSchema.safeParse(code);
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid PhaseStatus values', () => {
    for (const status of [
      'pending',
      'in_progress',
      'completed',
      'escaped',
    ] as const) {
      const result = PhaseStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });
});

// --- RunTransitionSchema ---

describe('RunTransitionSchema (discriminated union)', () => {
  it('parses start_phase action', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'validate',
    });
    expect(result.success).toBe(true);
  });

  it('parses complete_phase action', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'complete_phase',
      phase: 'validate',
      result: 'PASS',
      blocking_issues: 0,
      warning_issues: 2,
    });
    expect(result.success).toBe(true);
  });

  it('parses escape_phase action', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'escape_phase',
      phase: 'split',
      escape_code: 'E2-3',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid action', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'delete_phase',
      phase: 'validate',
    });
    expect(result.success).toBe(false);
  });

  it('rejects escape_phase with invalid phase (non-split)', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'escape_phase',
      phase: 'validate',
      escape_code: 'E2-1',
    });
    expect(result.success).toBe(false);
  });
});
