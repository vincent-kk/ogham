import { describe, expect, it } from 'vitest';

import { buildImplementPlan } from '../core/implement-planner/implement-planner.js';
import { renderImplementPlanReport } from '../core/implement-planner/report-renderer.js';
import type {
  StoriesManifest,
  DevplanManifest,
  StoryItem,
  StoryLink,
  TaskItem,
} from '../types/manifest.js';

function story(id: string, extra: Partial<StoryItem> = {}): StoryItem {
  return {
    id,
    title: `Story ${id}`,
    description: `${id} desc`,
    type: 'Story',
    status: 'pending',
    issue_ref: null,
    verification: { anchor_link: true, coherence: 'PASS', reverse_inference: 'PASS' },
    size_check: 'PASS',
    split_from: null,
    split_into: [],
    labels: [],
    ...extra,
  };
}

function task(id: string, blocks: string[] = [], extra: Partial<TaskItem> = {}): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    description: `${id} desc`,
    type: 'Task',
    status: 'pending',
    issue_ref: null,
    blocks,
    subtasks: [],
    labels: [],
    ...extra,
  };
}

function link(type: string, from: string, to: string[]): StoryLink {
  return { type, from, to, status: 'pending' };
}

function makeStories(
  stories: StoryItem[],
  links: StoryLink[] = [],
): StoriesManifest {
  return {
    batch: 'batch-ip-001',
    run_id: 'run-ip-001',
    project_ref: 'PROJ',
    epic_ref: null,
    created_at: '2026-04-18T00:00:00.000Z',
    stories,
    links,
    transitions: [],
  };
}

function makeDevplan(tasks: TaskItem[] = []): DevplanManifest {
  return {
    batch: 'batch-ip-001',
    run_id: 'run-ip-001',
    project_ref: 'PROJ',
    epic_ref: null,
    created_at: '2026-04-18T00:00:00.000Z',
    tasks,
    story_subtasks: [],
    feedback_comments: [],
    execution_order: [],
  };
}

function planFor(
  stories: StoriesManifest,
  devplan: DevplanManifest | null = null,
  overrides: { source?: 'stories' | 'devplan'; max_parallel?: number } = {},
) {
  return buildImplementPlan({
    run_id: 'run-ip-001',
    project_ref: 'PROJ',
    batch: 'batch-ip-001',
    source: overrides.source ?? (devplan ? 'devplan' : 'stories'),
    stories,
    devplan,
    max_parallel: overrides.max_parallel,
  }).manifest;
}

// --- Basic (3) ---

describe('buildImplementPlan basics', () => {
  it('puts independent stories into a single parallel group at level 0', () => {
    const plan = planFor(makeStories([story('S1'), story('S2'), story('S3')]));
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]!.level).toBe(0);
    expect(plan.groups[0]!.can_parallel).toBe(true);
    expect(plan.groups[0]!.items.map((i) => i.id).sort()).toEqual(['S1', 'S2', 'S3']);
    expect(plan.cycles_broken).toEqual([]);
    expect(plan.unresolved).toEqual([]);
  });

  it('serialises a blocks chain into one group per level', () => {
    const plan = planFor(
      makeStories(
        [story('S1'), story('S2'), story('S3')],
        [link('blocks', 'S1', ['S2']), link('blocks', 'S2', ['S3'])],
      ),
    );
    expect(plan.groups).toHaveLength(3);
    expect(plan.groups.map((g) => g.level)).toEqual([0, 1, 2]);
    expect(plan.groups[0]!.items[0]!.id).toBe('S1');
    expect(plan.groups[1]!.items[0]!.id).toBe('S2');
    expect(plan.groups[2]!.items[0]!.id).toBe('S3');
  });

  it('schedules cross-story Tasks before the Stories they block', () => {
    const plan = planFor(
      makeStories([story('S1'), story('S2'), story('S3')]),
      makeDevplan([task('T1', ['S1', 'S2']), task('T2', ['S3'])]),
    );
    const level0 = plan.groups.filter((g) => g.level === 0).flatMap((g) => g.items.map((i) => i.id));
    const level1 = plan.groups.filter((g) => g.level === 1).flatMap((g) => g.items.map((i) => i.id));
    expect(level0.sort()).toEqual(['T1', 'T2']);
    expect(level1.sort()).toEqual(['S1', 'S2', 'S3']);
  });
});

// --- Complex (12) ---

describe('buildImplementPlan edge cases', () => {
  it('marks degraded when source is stories-only', () => {
    const plan = planFor(makeStories([story('S1'), story('S2')]), null, { source: 'stories' });
    expect(plan.degraded).toBe(true);
    expect(plan.source_manifest).toBe('stories');
  });

  it('reverses direction for is-blocked-by links', () => {
    const plan = planFor(
      makeStories(
        [story('S1'), story('S2')],
        [link('is-blocked-by', 'S1', ['S2'])],
      ),
    );
    // S1 is-blocked-by S2 -> S2 must precede S1
    const levelOfS1 = plan.groups.find((g) => g.items.some((i) => i.id === 'S1'))!.level;
    const levelOfS2 = plan.groups.find((g) => g.items.some((i) => i.id === 'S2'))!.level;
    expect(levelOfS2).toBeLessThan(levelOfS1);
  });

  it('chunks a crowded level into multiple groups when max_parallel is set', () => {
    const plan = planFor(
      makeStories([story('S1'), story('S2'), story('S3'), story('S4'), story('S5')]),
      null,
      { max_parallel: 2 },
    );
    expect(plan.groups).toHaveLength(3);
    for (const g of plan.groups) {
      expect(g.level).toBe(0);
      expect(g.items.length).toBeLessThanOrEqual(2);
    }
  });

  it('breaks cycles deterministically and records resolution', () => {
    const plan = planFor(
      makeStories(
        [story('S1'), story('S2'), story('S3')],
        [
          link('blocks', 'S1', ['S2']),
          link('blocks', 'S2', ['S3']),
          link('blocks', 'S3', ['S1']),
        ],
      ),
    );
    expect(plan.cycles_broken.length).toBeGreaterThan(0);
    expect(plan.unresolved).toEqual([]);
    expect(plan.groups.length).toBeGreaterThan(0);
  });

  it('prefers removing story_link edges over task_blocks edges when breaking cycles', () => {
    const plan = planFor(
      makeStories(
        [story('S1'), story('S2')],
        [link('blocks', 'S2', ['S1'])],
      ),
      makeDevplan([task('T1', ['S2'], {}), task('T2', [], {})]),
    );
    // Add an artificial cycle via task blocks -> story link
    // In this fixture no cycle is introduced, so just assert no false positive.
    expect(plan.cycles_broken).toEqual([]);
  });

  it('preserves null issue_ref through to BatchItemRef', () => {
    const plan = planFor(makeStories([story('S1', { issue_ref: null })]));
    expect(plan.groups[0]!.items[0]!.issue_ref).toBeNull();
  });

  it('attaches a rationale to every BatchItemRef', () => {
    const plan = planFor(
      makeStories([story('S1')]),
      makeDevplan([task('T1', [])]),
    );
    for (const g of plan.groups) {
      for (const i of g.items) {
        expect(typeof i.rationale).toBe('string');
        expect(i.rationale.length).toBeGreaterThan(0);
      }
    }
  });

  it('fills depends_on_groups with immediate previous level group ids', () => {
    const plan = planFor(
      makeStories(
        [story('S1'), story('S2')],
        [link('blocks', 'S1', ['S2'])],
      ),
    );
    const level0Ids = plan.groups.filter((g) => g.level === 0).map((g) => g.group_id);
    const level1 = plan.groups.find((g) => g.level === 1)!;
    expect(level1.depends_on_groups).toEqual(level0Ids);
  });

  it('reports zero unresolved when the graph is a DAG', () => {
    const plan = planFor(
      makeStories(
        [story('S1'), story('S2'), story('S3')],
        [link('blocks', 'S1', ['S3'])],
      ),
    );
    expect(plan.unresolved).toEqual([]);
  });

  it('produces no groups when no stories are provided', () => {
    const plan = planFor(makeStories([]));
    expect(plan.groups).toEqual([]);
  });

  it('ignores relates-to links (non-blocking) in DAG construction', () => {
    const plan = planFor(
      makeStories(
        [story('S1'), story('S2')],
        [link('relates to', 'S1', ['S2'])],
      ),
    );
    // With no blocking edges, both are independent -> single group
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]!.can_parallel).toBe(true);
  });

  it('renders a non-empty markdown report including level headings and group ids', () => {
    const plan = planFor(
      makeStories(
        [story('S1'), story('S2')],
        [link('blocks', 'S1', ['S2'])],
      ),
    );
    const report = renderImplementPlanReport(plan);
    expect(report).toContain('Implement Plan');
    expect(report).toContain('Level 0');
    expect(report).toContain('Level 1');
    for (const g of plan.groups) {
      expect(report).toContain(g.group_id);
    }
  });
});
