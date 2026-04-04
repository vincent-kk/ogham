import { describe, expect, it } from 'vitest';

import { planExecution } from '../core/execution-planner.js';
import type { DevplanManifest } from '../types/manifest.js';

function makeManifest(overrides?: Partial<DevplanManifest>): DevplanManifest {
  return {
    batch: 'batch-001',
    run_id: '20240101-001',
    project_ref: 'PROJ',
    epic_ref: null,
    created_at: '2024-01-01T00:00:00.000Z',
    tasks: [],
    story_subtasks: [],
    feedback_comments: [],
    execution_order: [],
    ...overrides,
  };
}

// --- Basic (3) ---

describe('planExecution', () => {
  it('returns empty steps for empty execution_order', () => {
    const manifest = makeManifest();
    const plan = planExecution(manifest);
    expect(plan.steps).toHaveLength(0);
    expect(plan.total_pending).toBe(0);
  });

  it('filters only pending items from execution_order', () => {
    const manifest = makeManifest({
      tasks: [
        {
          id: 'T-001',
          title: 'Task 1',
          description: 'Desc',
          type: 'Task',
          status: 'pending',
          issue_ref: null,
          blocks: [],
          subtasks: [],
        },
        {
          id: 'T-002',
          title: 'Task 2',
          description: 'Desc',
          type: 'Task',
          status: 'created',
          issue_ref: null,
          blocks: [],
          subtasks: [],
        },
      ],
      execution_order: [
        { step: 1, action: 'create_tasks', items: ['T-001', 'T-002'] },
      ],
    });

    const plan = planExecution(manifest);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]!.items).toEqual(['T-001']);
    expect(plan.steps[0]!.pending_count).toBe(1);
  });

  it('returns correct total_pending count', () => {
    const manifest = makeManifest({
      tasks: [
        {
          id: 'T-001', title: 'T1', description: 'D', type: 'Task',
          status: 'pending', issue_ref: null, blocks: [],
          subtasks: [
            { id: 'ST-001', title: 'S1', description: 'D', status: 'pending', issue_ref: null },
            { id: 'ST-002', title: 'S2', description: 'D', status: 'created', issue_ref: null },
          ],
        },
      ],
      execution_order: [
        { step: 1, action: 'create_tasks', items: ['T-001'] },
        { step: 2, action: 'create_task_subtasks', items: ['ST-001', 'ST-002'] },
      ],
    });

    const plan = planExecution(manifest);
    expect(plan.total_pending).toBe(2); // T-001, ST-001
  });
});

// --- Complex (12) ---

describe('planExecution filtering', () => {
  it('skips steps where all items are non-pending', () => {
    const manifest = makeManifest({
      tasks: [
        {
          id: 'T-001', title: 'T1', description: 'D', type: 'Task',
          status: 'created', issue_ref: null, blocks: [], subtasks: [],
        },
      ],
      execution_order: [
        { step: 1, action: 'create_tasks', items: ['T-001'] },
      ],
    });

    const plan = planExecution(manifest);
    expect(plan.steps).toHaveLength(0);
    expect(plan.total_pending).toBe(0);
  });

  it('preserves step number and action in output', () => {
    const manifest = makeManifest({
      tasks: [
        {
          id: 'T-001', title: 'T', description: 'D', type: 'Task',
          status: 'pending', issue_ref: null, blocks: [], subtasks: [],
        },
      ],
      execution_order: [
        { step: 3, action: 'create_tasks', items: ['T-001'] },
      ],
    });

    const plan = planExecution(manifest);
    expect(plan.steps[0]!.step).toBe(3);
    expect(plan.steps[0]!.action).toBe('create_tasks');
  });

  it('includes pending items from story_subtasks', () => {
    const manifest = makeManifest({
      story_subtasks: [
        {
          story_id: 'S-001',
          story_ref: null,
          subtasks: [
            { id: 'SS-001', title: 'SS1', description: 'D', status: 'pending', issue_ref: null },
            { id: 'SS-002', title: 'SS2', description: 'D', status: 'failed', issue_ref: null },
          ],
        },
      ],
      execution_order: [
        { step: 1, action: 'create_story_subtasks', items: ['SS-001', 'SS-002'] },
      ],
    });

    const plan = planExecution(manifest);
    expect(plan.steps[0]!.items).toEqual(['SS-001']);
    expect(plan.total_pending).toBe(1);
  });

  it('includes pending feedback_comments via target_story', () => {
    const manifest = makeManifest({
      feedback_comments: [
        {
          target_story: 'S-001',
          target_ref: null,
          comment: 'Fix this',
          type: 'mapping_divergence',
          status: 'pending',
        },
      ],
      execution_order: [
        { step: 1, action: 'add_feedback_comments', items: ['S-001'] },
      ],
    });

    const plan = planExecution(manifest);
    expect(plan.steps[0]!.items).toEqual(['S-001']);
    expect(plan.total_pending).toBe(1);
  });

  it('excludes non-pending feedback_comments', () => {
    const manifest = makeManifest({
      feedback_comments: [
        {
          target_story: 'S-001',
          target_ref: null,
          comment: 'Done',
          type: 'mapping_divergence',
          status: 'created',
        },
      ],
      execution_order: [
        { step: 1, action: 'add_feedback_comments', items: ['S-001'] },
      ],
    });

    const plan = planExecution(manifest);
    expect(plan.steps).toHaveLength(0);
  });

  it('handles multiple steps with partial pending items', () => {
    const manifest = makeManifest({
      tasks: [
        {
          id: 'T-001', title: 'T1', description: 'D', type: 'Task',
          status: 'pending', issue_ref: null, blocks: [],
          subtasks: [
            { id: 'ST-001', title: 'S1', description: 'D', status: 'created', issue_ref: null },
            { id: 'ST-002', title: 'S2', description: 'D', status: 'pending', issue_ref: null },
          ],
        },
      ],
      execution_order: [
        { step: 1, action: 'create_tasks', items: ['T-001'] },
        { step: 2, action: 'create_task_subtasks', items: ['ST-001', 'ST-002'] },
      ],
    });

    const plan = planExecution(manifest);
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]!.items).toEqual(['T-001']);
    expect(plan.steps[1]!.items).toEqual(['ST-002']);
    expect(plan.total_pending).toBe(2);
  });

  it('handles execution_order items not in any manifest collection', () => {
    const manifest = makeManifest({
      execution_order: [
        { step: 1, action: 'create_tasks', items: ['T-GHOST'] },
      ],
    });

    const plan = planExecution(manifest);
    // T-GHOST is not in any pending set, so step is omitted
    expect(plan.steps).toHaveLength(0);
    expect(plan.total_pending).toBe(0);
  });
});
