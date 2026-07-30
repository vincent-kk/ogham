import { describe, expect, it } from 'vitest';

import {
  DevplanManifestSchema,
  StoriesManifestSchema,
  StoryItemSchema,
  SubtaskItemSchema,
  TaskItemSchema,
  TransitionItemSchema,
} from '../types/manifest.js';

// --- Manifest labels field (AC18) ---

describe('Manifest schemas labels field', () => {
  const storyBase = {
    id: 'S-001',
    title: 'T',
    description: 'D',
    type: 'Story',
    verification: {
      anchor_link: true,
      coherence: 'PASS' as const,
      reverse_inference: 'PASS' as const,
    },
    size_check: 'PASS' as const,
  };

  it('StoryItemSchema defaults labels to empty array', () => {
    const result = StoryItemSchema.safeParse(storyBase);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.labels).toEqual([]);
  });

  it('StoryItemSchema preserves provided labels', () => {
    const result = StoryItemSchema.safeParse({
      ...storyBase,
      labels: ['imbas-managed'],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.labels).toEqual(['imbas-managed']);
  });

  it('SubtaskItemSchema defaults labels to empty array', () => {
    const result = SubtaskItemSchema.safeParse({
      id: 'ST-1',
      title: 'T',
      description: 'D',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.labels).toEqual([]);
  });

  it('TaskItemSchema defaults labels to empty array', () => {
    const result = TaskItemSchema.safeParse({
      id: 'T-1',
      title: 'T',
      description: 'D',
      type: 'Task',
      blocks: [],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.labels).toEqual([]);
  });
});

// --- StoriesManifestSchema ---

describe('StoriesManifestSchema', () => {
  const validManifest = {
    batch: 'batch-001',
    run_id: '20240101-001',
    project_ref: 'PROJ',
    epic_ref: null,
    created_at: '2024-01-01T00:00:00.000Z',
    stories: [
      {
        id: 'S-001',
        title: 'Story 1',
        description: 'Description',
        type: 'Story',
        verification: {
          anchor_link: true,
          coherence: 'PASS',
          reverse_inference: 'PASS',
        },
        size_check: 'PASS',
      },
    ],
  };

  it('parses valid stories manifest', () => {
    const result = StoriesManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it('rejects missing required field batch', () => {
    const { batch: _batch, ...bad } = validManifest;
    const result = StoriesManifestSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects missing required field run_id', () => {
    const { run_id: _runId, ...bad } = validManifest;
    const result = StoriesManifestSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('defaults transitions to empty array when omitted (backward compat)', () => {
    const result = StoriesManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.transitions).toEqual([]);
  });

  it('parses manifest with transitions array', () => {
    const withTransitions = {
      ...validManifest,
      transitions: [
        {
          issue_ref: 'S-001',
          target_status: 'Done',
          reason: 'horizontal_split',
        },
      ],
    };
    const result = StoriesManifestSchema.safeParse(withTransitions);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.transitions).toHaveLength(1);
    expect(result.data.transitions[0]!.target_status).toBe('Done');
    expect(result.data.transitions[0]!.reason).toBe('horizontal_split');
    expect(result.data.transitions[0]!.status).toBe('pending');
  });
});

// --- TransitionItemSchema ---

describe('TransitionItemSchema', () => {
  it('parses valid transition item with horizontal_split reason', () => {
    const result = TransitionItemSchema.safeParse({
      issue_ref: 'S-001',
      target_status: 'Done',
      reason: 'horizontal_split',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.status).toBe('pending');
  });

  it('defaults status to pending when omitted (source_split)', () => {
    const result = TransitionItemSchema.safeParse({
      issue_ref: 'PROJ-123',
      target_status: 'Done',
      reason: 'source_split',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.status).toBe('pending');
  });

  it('rejects invalid reason enum value', () => {
    const result = TransitionItemSchema.safeParse({
      issue_ref: 'S-001',
      target_status: 'Done',
      reason: 'invalid_reason',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing issue_ref', () => {
    const result = TransitionItemSchema.safeParse({
      target_status: 'Done',
      reason: 'horizontal_split',
    });
    expect(result.success).toBe(false);
  });

  it('accepts skipped status from ManifestItemStatusSchema', () => {
    const result = TransitionItemSchema.safeParse({
      issue_ref: 'S-001',
      target_status: 'Done',
      reason: 'horizontal_split',
      status: 'skipped',
    });
    expect(result.success).toBe(true);
  });
});

// --- DevplanManifestSchema ---

describe('DevplanManifestSchema', () => {
  const validDevplan = {
    batch: 'batch-001',
    run_id: '20240101-001',
    project_ref: 'PROJ',
    epic_ref: null,
    created_at: '2024-01-01T00:00:00.000Z',
    tasks: [
      {
        id: 'T-001',
        title: 'Task 1',
        description: 'Do something',
        type: 'Task',
        blocks: [],
        subtasks: [
          { id: 'ST-001', title: 'Subtask 1', description: 'Sub desc' },
        ],
      },
    ],
    execution_order: [{ step: 1, action: 'create_tasks', items: ['T-001'] }],
  };

  it('parses valid devplan manifest with execution_order', () => {
    const result = DevplanManifestSchema.safeParse(validDevplan);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.execution_order).toHaveLength(1);
    expect(result.data.execution_order[0]!.step).toBe(1);
  });

  it('rejects invalid execution step action', () => {
    const bad = {
      ...validDevplan,
      execution_order: [
        { step: 1, action: 'invalid_action', items: ['T-001'] },
      ],
    };
    const result = DevplanManifestSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('defaults empty arrays when omitted', () => {
    const minimal = {
      batch: 'b',
      run_id: 'r',
      project_ref: 'P',
      epic_ref: null,
      created_at: '2024-01-01T00:00:00.000Z',
    };
    const result = DevplanManifestSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.tasks).toEqual([]);
    expect(result.data.execution_order).toEqual([]);
  });
});
