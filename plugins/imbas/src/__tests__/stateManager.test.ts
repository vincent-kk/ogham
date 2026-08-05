import { describe, expect, it } from 'vitest';

import { applyTransition, createRunState } from '../core/stateManager/index.js';
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

function withRefineCompleted(
  state: RunState,
  result: 'PASS' | 'PASS_WITH_WARNINGS' | 'BLOCKED' = 'PASS',
): RunState {
  return {
    ...state,
    phases: {
      ...state.phases,
      refine: {
        ...state.phases.refine,
        status: 'completed',
        result,
        completed_at: new Date().toISOString(),
      },
    },
  };
}

function withEstimate(
  state: RunState,
  status: 'completed' | 'skipped' | 'in_progress',
): RunState {
  return {
    ...state,
    phases: {
      ...state.phases,
      estimate: {
        ...state.phases.estimate,
        status,
        completed_at:
          status === 'in_progress' ? null : new Date().toISOString(),
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

// --- createRunState ---

describe('createRunState', () => {
  it('returns valid initial state', () => {
    const state = makeState();
    expect(state.run_id).toBe('20240101-001');
    expect(state.project_ref).toBe('PROJ');
    expect(state.current_phase).toBe('refine');
    expect(state.phases.refine.status).toBe('pending');
    expect(state.phases.estimate.status).toBe('pending');
    expect(state.phases.estimate.estimated_manday).toBeNull();
    expect(state.phases.split.status).toBe('pending');
  });
});

// --- start_phase ---

describe('applyTransition start_phase refine', () => {
  it('always allows starting refine phase', () => {
    const state = makeState();
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'refine',
    });
    expect(next.phases.refine.status).toBe('in_progress');
    expect(next.current_phase).toBe('refine');
  });
});

describe('start_phase estimate', () => {
  it('succeeds when refine is completed with PASS', () => {
    const state = withRefineCompleted(makeState(), 'PASS');
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'estimate',
    });
    expect(next.phases.estimate.status).toBe('in_progress');
  });

  it('fails when refine is not completed', () => {
    const state = makeState();
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'estimate',
      }),
    ).toThrow('refine status is "pending"');
  });

  it('fails when refine result is BLOCKED', () => {
    const state = withRefineCompleted(makeState(), 'BLOCKED');
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'estimate',
      }),
    ).toThrow('Cannot start phase "estimate"');
  });
});

describe('start_phase split', () => {
  it('succeeds when refine passed and estimate completed', () => {
    const state = withEstimate(
      withRefineCompleted(makeState(), 'PASS_WITH_WARNINGS'),
      'completed',
    );
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'split',
    });
    expect(next.phases.split.status).toBe('in_progress');
  });

  it('succeeds when refine passed and estimate skipped', () => {
    const state = withEstimate(withRefineCompleted(makeState()), 'skipped');
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'split',
    });
    expect(next.phases.split.status).toBe('in_progress');
  });

  it('fails when refine is not completed', () => {
    const state = makeState();
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'split',
      }),
    ).toThrow('refine status is "pending"');
  });

  it('fails when estimate is still pending', () => {
    const state = withRefineCompleted(makeState());
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'split',
      }),
    ).toThrow('estimate status is "pending"');
  });

  it('fails when estimate is in_progress', () => {
    const state = withEstimate(withRefineCompleted(makeState()), 'in_progress');
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'start_phase',
        phase: 'split',
      }),
    ).toThrow('estimate status is "in_progress"');
  });
});

// --- complete_phase ---

describe('complete_phase refine', () => {
  function refineInProgress(): RunState {
    const base = makeState();
    return {
      ...base,
      phases: {
        ...base.phases,
        refine: { ...base.phases.refine, status: 'in_progress' },
      },
    };
  }

  it('sets result and issue counts, advances to estimate', () => {
    const next = applyTransition(refineInProgress(), {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'complete_phase',
      phase: 'refine',
      result: 'PASS_WITH_WARNINGS',
      blocking_issues: 0,
      warning_issues: 3,
    });
    expect(next.phases.refine.status).toBe('completed');
    expect(next.phases.refine.result).toBe('PASS_WITH_WARNINGS');
    expect(next.phases.refine.warning_issues).toBe(3);
    expect(next.current_phase).toBe('estimate');
  });

  it('requires result field', () => {
    expect(() =>
      applyTransition(refineInProgress(), {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'complete_phase',
        phase: 'refine',
      }),
    ).toThrow('complete_phase(refine) requires "result"');
  });

  it('stays on refine when result is BLOCKED', () => {
    const next = applyTransition(refineInProgress(), {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'complete_phase',
      phase: 'refine',
      result: 'BLOCKED',
      blocking_issues: 2,
    });
    expect(next.phases.refine.status).toBe('completed');
    expect(next.current_phase).toBe('refine');
  });

  it('fails when phase is still pending (not in_progress)', () => {
    expect(() =>
      applyTransition(makeState(), {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'complete_phase',
        phase: 'refine',
        result: 'PASS',
      }),
    ).toThrow('expected "in_progress"');
  });
});

describe('complete_phase estimate', () => {
  function estimateInProgress(): RunState {
    return withEstimate(withRefineCompleted(makeState()), 'in_progress');
  }

  it('records estimated_manday and advances to split', () => {
    const next = applyTransition(estimateInProgress(), {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'complete_phase',
      phase: 'estimate',
      estimated_manday: 66.4,
    });
    expect(next.phases.estimate.status).toBe('completed');
    expect(next.phases.estimate.estimated_manday).toBe(66.4);
    expect(next.current_phase).toBe('split');
  });

  it('requires estimated_manday field', () => {
    expect(() =>
      applyTransition(estimateInProgress(), {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'complete_phase',
        phase: 'estimate',
      }),
    ).toThrow('complete_phase(estimate) requires "estimated_manday"');
  });
});

describe('complete_phase split', () => {
  it('applies stories_created and pending_review', () => {
    const state = withSplitInProgress(
      withEstimate(withRefineCompleted(makeState()), 'skipped'),
    );
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
    expect(next.phases.split.pending_review).toBe(false);
  });
});

// --- escape_phase ---

describe('escape_phase', () => {
  it('succeeds for split phase when in_progress', () => {
    const state = withSplitInProgress(
      withEstimate(withRefineCompleted(makeState()), 'completed'),
    );
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

// --- skip_phases ---

describe('skip_phases', () => {
  it('rejects skipping estimate before refine has passed', () => {
    const state = makeState();
    expect(() =>
      applyTransition(state, {
        project_ref: 'PROJ',
        run_id: '20240101-001',
        action: 'skip_phases',
        phases: ['estimate'],
      }),
    ).toThrow('Cannot skip phases');
  });

  it('marks estimate as skipped and advances current_phase to split', () => {
    const state = withRefineCompleted(makeState());
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'skip_phases',
      phases: ['estimate'],
    });
    expect(next.phases.estimate.status).toBe('skipped');
    expect(next.phases.estimate.estimated_manday).toBeNull();
    expect(next.current_phase).toBe('split');
  });

  it('re-skipping a completed estimate is an idempotent no-op', () => {
    const state = withEstimate(withRefineCompleted(makeState()), 'completed');
    const next = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'skip_phases',
      phases: ['estimate'],
    });
    expect(next.phases.estimate.status).toBe('completed');
    expect(next.current_phase).toBe(state.current_phase);
  });

  it('allows start_phase split after skipping estimate', () => {
    const state = withRefineCompleted(makeState());
    const skipped = applyTransition(state, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'skip_phases',
      phases: ['estimate'],
    });
    const next = applyTransition(skipped, {
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'split',
    });
    expect(next.phases.split.status).toBe('in_progress');
    expect(next.current_phase).toBe('split');
  });
});
