import { describe, expect, it } from 'vitest';

import {
  EstimationManifestSchema,
  EstimationUnitSchema,
  StoriesManifestSchema,
  StoryItemSchema,
  TransitionItemSchema,
} from '../types/manifest.js';

// --- StoryItemSchema ---

describe('StoryItemSchema', () => {
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

  it('defaults labels to empty array', () => {
    const result = StoryItemSchema.safeParse(storyBase);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.labels).toEqual([]);
  });

  it('preserves provided labels', () => {
    const result = StoryItemSchema.safeParse({
      ...storyBase,
      labels: ['imbas-managed'],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.labels).toEqual(['imbas-managed']);
  });

  it('defaults estimate_manday to null (pre-estimation manifests parse)', () => {
    const result = StoryItemSchema.safeParse(storyBase);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.estimate_manday).toBeNull();
  });

  it('accepts a nonnegative estimate_manday and rejects negatives', () => {
    const ok = StoryItemSchema.safeParse({
      ...storyBase,
      estimate_manday: 3.25,
    });
    expect(ok.success).toBe(true);
    const bad = StoryItemSchema.safeParse({
      ...storyBase,
      estimate_manday: -1,
    });
    expect(bad.success).toBe(false);
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

  it('parses valid stories manifest and defaults version to 2', () => {
    const result = StoriesManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.version).toBe(2);
  });

  it('rejects a foreign version value', () => {
    const result = StoriesManifestSchema.safeParse({
      ...validManifest,
      version: 1,
    });
    expect(result.success).toBe(false);
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
});

// --- EstimationManifestSchema ---

const validUnit = {
  id: 'U-1',
  name: '이메일 로그인',
  view_refs: {
    page: ['로그인 화면'],
    feature: ['이메일 로그인'],
    module: ['인증'],
  },
  complexity: 'M',
  estimate: { o: 1.5, m: 3, p: 6, expected: 3.25, sigma: 0.75 },
  rationale: '표준 인증 플로우',
};

describe('EstimationUnitSchema', () => {
  it('parses a valid unit and defaults single_view/deps', () => {
    const result = EstimationUnitSchema.safeParse(validUnit);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.single_view).toBe(false);
    expect(result.data.deps).toEqual([]);
  });

  it('rejects an unknown complexity grade', () => {
    const result = EstimationUnitSchema.safeParse({
      ...validUnit,
      complexity: 'XXL',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative PERT values', () => {
    const result = EstimationUnitSchema.safeParse({
      ...validUnit,
      estimate: { o: -1, m: 3, p: 6, expected: 3.25, sigma: 0.75 },
    });
    expect(result.success).toBe(false);
  });
});

describe('EstimationManifestSchema', () => {
  const validEstimation = {
    run_id: '20240101-001',
    project_ref: 'PROJ',
    source: 'refined.md',
    created_at: '2024-01-01T00:00:00.000Z',
    units: [validUnit],
    rollup: {
      sum_expected: 3.25,
      overhead: { integration: 0.3, test: 0.5, pm: 0.2 },
      buffered_total: 5.1,
      confidence_interval: [3.6, 6.6],
    },
    schedule: {
      tracks: [{ track: 1, units: ['U-1'] }],
      milestones: [{ name: '인증 완료', week: 1 }],
      total_weeks: 1,
    },
  };

  it('parses a valid estimation manifest with defaults', () => {
    const result = EstimationManifestSchema.safeParse(validEstimation);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.version).toBe(1);
    expect(result.data.assumptions).toEqual([]);
    expect(result.data.risks).toEqual([]);
    expect(result.data.config_used).toEqual({});
  });

  it('rejects when rollup is missing', () => {
    const { rollup: _rollup, ...bad } = validEstimation;
    const result = EstimationManifestSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects a confidence_interval that is not a 2-tuple', () => {
    const result = EstimationManifestSchema.safeParse({
      ...validEstimation,
      rollup: { ...validEstimation.rollup, confidence_interval: [1] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid risk impact', () => {
    const result = EstimationManifestSchema.safeParse({
      ...validEstimation,
      risks: [{ unit: 'U-1', risk: 'API 미확정', impact: 'severe' }],
    });
    expect(result.success).toBe(false);
  });
});
