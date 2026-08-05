import { describe, expect, it } from 'vitest';

import {
  ImbasConfigSchema,
  LabelsConfigSchema,
  ProviderSchema,
} from '../types/config.js';

// --- ImbasConfigSchema ---

describe('ImbasConfigSchema', () => {
  it('fills in defaults when given empty object', () => {
    const result = ImbasConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.version).toBe('2.0');
    expect(result.data.language.documents).toBe('ko');
    expect(result.data.defaults.llm_model.estimate).toBe('opus');
    expect(result.data.jira.issue_types.epic).toBe('Epic');
  });

  it('preserves custom values', () => {
    const input = {
      version: '2.0',
      language: {
        documents: 'en',
        skills: 'ko',
        issue_content: 'en',
        reports: 'en',
      },
      defaults: {
        project_ref: 'MYPROJ',
        llm_model: { refine: 'haiku', estimate: 'sonnet', split: 'haiku' },
      },
    };
    const result = ImbasConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.version).toBe('2.0');
    expect(result.data.defaults.project_ref).toBe('MYPROJ');
    expect(result.data.defaults.llm_model.refine).toBe('haiku');
  });

  it('fills estimation defaults and preserves overrides', () => {
    const empty = ImbasConfigSchema.safeParse({});
    expect(empty.success).toBe(true);
    if (!empty.success) return;
    expect(empty.data.estimation.team_size).toBe(2);
    expect(empty.data.estimation.complexity_baseline).toEqual({
      S: 1,
      M: 3,
      L: 8,
      XL: 20,
    });
    expect(empty.data.estimation.overhead_ratio.test).toBe(0.15);
    expect(empty.data.estimation.buffer_ratio).toBe(0.2);

    const custom = ImbasConfigSchema.safeParse({
      estimation: { team_size: 4, buffer_ratio: 0.3 },
    });
    expect(custom.success).toBe(true);
    if (!custom.success) return;
    expect(custom.data.estimation.team_size).toBe(4);
    expect(custom.data.estimation.buffer_ratio).toBe(0.3);
    expect(custom.data.estimation.complexity_baseline.M).toBe(3);
  });

  it('rejects a non-positive estimation team_size', () => {
    const result = ImbasConfigSchema.safeParse({
      estimation: { team_size: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('defaults provider to jira', () => {
    const result = ImbasConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.provider).toBe('jira');
  });

  it('accepts provider: local', () => {
    const result = ImbasConfigSchema.safeParse({ provider: 'local' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.provider).toBe('local');
  });

  it('accepts provider: github', () => {
    const result = ImbasConfigSchema.safeParse({ provider: 'github' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown provider', () => {
    const result = ImbasConfigSchema.safeParse({ provider: 'bitbucket' });
    expect(result.success).toBe(false);
  });
});

// --- LabelsConfigSchema ---

describe('LabelsConfigSchema', () => {
  it('fills all 6 default labels from empty object (AC1)', () => {
    const result = LabelsConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.managed).toBe('imbas-managed');
    expect(result.data.review_pending).toBe('review-pending');
    expect(result.data.review_complete).toBe('review-complete');
    expect(result.data.dev_waiting).toBe('개발대기');
    expect(result.data.dev_in_progress).toBe('개발중');
    expect(result.data.dev_done).toBe('개발완료');
  });

  it('preserves partial override while keeping other defaults (AC2)', () => {
    const result = LabelsConfigSchema.safeParse({ managed: 'custom-managed' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.managed).toBe('custom-managed');
    expect(result.data.review_pending).toBe('review-pending');
    expect(result.data.dev_waiting).toBe('개발대기');
  });
});

describe('ImbasConfigSchema labels integration', () => {
  it('auto-fills labels section from empty config (AC1)', () => {
    const result = ImbasConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.labels.managed).toBe('imbas-managed');
    expect(result.data.labels.dev_done).toBe('개발완료');
  });

  it('defaults jira.phase_to_workflow.pipeline_exit to ready_for_dev (AC3)', () => {
    const result = ImbasConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.jira.phase_to_workflow.pipeline_exit).toBe(
      'ready_for_dev',
    );
  });

  it('allows custom phase_to_workflow.pipeline_exit', () => {
    const result = ImbasConfigSchema.safeParse({
      jira: { phase_to_workflow: { pipeline_exit: 'Ready' } },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.jira.phase_to_workflow.pipeline_exit).toBe('Ready');
  });
});

// --- ProviderSchema ---

describe('ProviderSchema', () => {
  it('accepts exactly jira, github, local', () => {
    expect(ProviderSchema.safeParse('jira').success).toBe(true);
    expect(ProviderSchema.safeParse('github').success).toBe(true);
    expect(ProviderSchema.safeParse('local').success).toBe(true);
  });

  it('rejects case-sensitive mismatch', () => {
    expect(ProviderSchema.safeParse('Jira').success).toBe(false);
    expect(ProviderSchema.safeParse('LOCAL').success).toBe(false);
  });
});
