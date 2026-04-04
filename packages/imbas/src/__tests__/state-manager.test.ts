import { describe, expect, it } from 'vitest';

import { createRunState, applyTransition } from '../core/state-manager.js';
import type { RunState } from '../types/state.js';

// --- Helpers ---

function makeState(overrides?: Partial<RunState>): RunState {
  const base = createRunState({
    run_id: '20240101-001',
    project_ref: 'PROJ',
    source_file: 'requirements.md',
  });
  return { ...base, ...overrides };
}

function withValidateCompleted(state: RunState, result: 'PASS' | 'PASS_WITH_WARNINGS' | 'BLOCKED' = 'PASS'): RunState {
  return {
    ...state,
    phases: {
      ...state.phases,
      validate: {
        ...state.phases.validate,
        status: 'completed',
        result,
        completed_at: new Date().toISOString(),
      },
    },
  };
}

function withSplitInProgress(state: RunState): RunState {
  return {
    ...state,
    phases: {
      ...state.phases,
      split: {
        ...state.phases.split,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      },
    },
  };
}

function withSplitCompleted(state: RunState, pendingReview = false): RunState {
  return {
    ...state,
    phases: {
      ...state.phases,
      split: {
        ...state.phases.split,
        status: 'completed',
        completed_at: new Date().toISOString(),
        pending_review: pendingReview,
      },
    },
  };
}

function withSplitEscaped(state: RunState, escape_code: 'E2-1' | 'E2-2' | 'E2-3' | 'EC-1' | 'EC-2'): RunState {
  return {
    ...state,
    phases: {
      ...state.phases,
      split: {
        ...state.phases.split,
        status: 'escaped',
        completed_at: new Date().toISOString(),
        escape_code,
      },
    },
  };
}

// --- Basic (3) ---

describe('createRunState', () => {
  it('returns valid initial state', () => {
    const state = makeState();
    expect(state.run_id).toBe('20240101-001');
    expect(state.project_ref).toBe('PROJ');
    expect(state.current_phase).toBe('validate');
    expect(state.phases.validate.status).toBe('pending');
    expect(state.phases.split.status).toBe('pending');
    expect(state.phases.devplan.status).toBe('pending');
  });
});

describe('applyTransition start_phase validate', () => {
  it('always allows starting validate phase', () => {
    const state = makeState();
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'validate',
    });
    expect(next.phases.validate.status).toBe('in_progress');
    expect(next.current_phase).toBe('validate');
  });
});

describe('applyTransition complete_phase validate', () => {
  it('sets result and issue counts', () => {
    const state = {
      ...makeState(),
      phases: {
        ...makeState().phases,
        validate: { ...makeState().phases.validate, status: 'in_progress' as const },
      },
    };
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'complete_phase',
      phase: 'validate',
      result: 'PASS_WITH_WARNINGS',
      blocking_issues: 0,
      warning_issues: 3,
    });
    expect(next.phases.validate.status).toBe('completed');
    expect(next.phases.validate.result).toBe('PASS_WITH_WARNINGS');
    expect(next.phases.validate.blocking_issues).toBe(0);
    expect(next.phases.validate.warning_issues).toBe(3);
  });
});

// --- Complex (12) ---

describe('start_phase split', () => {
  it('succeeds when validate is completed with PASS', () => {
    const state = withValidateCompleted(makeState(), 'PASS');
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'split',
    });
    expect(next.phases.split.status).toBe('in_progress');
  });

  it('succeeds when validate is completed with PASS_WITH_WARNINGS', () => {
    const state = withValidateCompleted(makeState(), 'PASS_WITH_WARNINGS');
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'split',
    });
    expect(next.phases.split.status).toBe('in_progress');
  });

  it('fails when validate is not completed', () => {
    const state = makeState();
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'split',
      }),
    ).toThrow('validate phase status is "pending"');
  });

  it('fails when validate result is BLOCKED', () => {
    const state = withValidateCompleted(makeState(), 'BLOCKED');
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'split',
      }),
    ).toThrow('validate result is "BLOCKED"');
  });
});

describe('start_phase devplan', () => {
  it('succeeds when split is completed without pending_review', () => {
    const state = withSplitCompleted(withValidateCompleted(makeState()), false);
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'devplan',
    });
    expect(next.phases.devplan.status).toBe('in_progress');
  });

  it('succeeds when split escaped with E2-3', () => {
    const state = withSplitEscaped(withValidateCompleted(makeState()), 'E2-3');
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'devplan',
    });
    expect(next.phases.devplan.status).toBe('in_progress');
  });

  it('fails when split has pending_review=true', () => {
    const state = withSplitCompleted(withValidateCompleted(makeState()), true);
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'devplan',
      }),
    ).toThrow('Cannot start phase "devplan"');
  });

  it('fails when split escaped with non-E2-3 code', () => {
    const state = withSplitEscaped(withValidateCompleted(makeState()), 'E2-1');
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'devplan',
      }),
    ).toThrow('Cannot start phase "devplan"');
  });
});

describe('complete_phase', () => {
  it('succeeds when phase is in_progress', () => {
    const state = withSplitInProgress(withValidateCompleted(makeState()));
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'complete_phase',
      phase: 'split',
      stories_created: 5,
      pending_review: false,
    });
    expect(next.phases.split.status).toBe('completed');
    expect(next.phases.split.stories_created).toBe(5);
  });

  it('fails when phase is still pending (not in_progress)', () => {
    const state = makeState();
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'complete_phase',
        phase: 'validate',
      }),
    ).toThrow('expected "in_progress"');
  });

  it('advances current_phase to next phase after completion', () => {
    const state = {
      ...makeState(),
      phases: {
        ...makeState().phases,
        validate: { ...makeState().phases.validate, status: 'in_progress' as const },
      },
    };
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'complete_phase',
      phase: 'validate',
      result: 'PASS',
    });
    expect(next.current_phase).toBe('split');
  });
});

describe('escape_phase', () => {
  it('succeeds for split phase when in_progress', () => {
    const state = withSplitInProgress(withValidateCompleted(makeState()));
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'escape_phase',
      phase: 'split',
      escape_code: 'E2-1',
    });
    expect(next.phases.split.status).toBe('escaped');
    expect(next.phases.split.escape_code).toBe('E2-1');
  });

  it('fails when split is not in_progress', () => {
    const state = makeState();
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'escape_phase',
        phase: 'split',
        escape_code: 'E2-2',
      }),
    ).toThrow('expected "in_progress"');
  });
});

describe('skip_phases', () => {
  it('marks validate and split as completed with correct defaults', () => {
    const state = makeState();
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'skip_phases',
      phases: ['validate', 'split'],
    });
    expect(next.phases.validate.status).toBe('completed');
    expect(next.phases.validate.result).toBe('PASS');
    expect(next.phases.validate.blocking_issues).toBe(0);
    expect(next.phases.validate.warning_issues).toBe(0);
    expect(next.phases.split.status).toBe('completed');
    expect(next.phases.split.pending_review).toBe(false);
    expect(next.phases.split.stories_created).toBe(0);
  });

  it('advances current_phase past all skipped phases', () => {
    const state = makeState();
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'skip_phases',
      phases: ['validate', 'split'],
    });
    expect(next.current_phase).toBe('devplan');
  });

  it('sets metadata.skipped_phases for auditability', () => {
    const state = makeState();
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'skip_phases',
      phases: ['validate', 'split'],
    });
    expect(next.metadata?.skipped_phases).toEqual(['validate', 'split']);
  });

  it('allows start_phase devplan after skip_phases', () => {
    const state = makeState();
    const skipped = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'skip_phases',
      phases: ['validate', 'split'],
    });
    const next = applyTransition(skipped, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'devplan',
    });
    expect(next.phases.devplan.status).toBe('in_progress');
    expect(next.current_phase).toBe('devplan');
  });
});
