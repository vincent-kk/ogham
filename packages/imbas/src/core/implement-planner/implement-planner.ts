/**
 * @file implement-planner.ts
 * @description Build ImplementPlanManifest from stories/devplan manifests via DAG topo-sort
 */

import type {
  StoriesManifest,
  DevplanManifest,
  ImplementPlanManifest,
  ImplementPlanSource,
} from '../../types/manifest.js';
import { collectGraph } from './dependency-collector.js';
import { assignLevels } from './topo-leveler.js';
import type { CollectedNode } from './dependency-collector.js';

export interface ImplementPlanInput {
  run_id: string;
  project_ref: string;
  batch: string;
  source: ImplementPlanSource;
  stories: StoriesManifest;
  devplan?: DevplanManifest | null;
  max_parallel?: number;
}

export interface ImplementPlanResult {
  manifest: ImplementPlanManifest;
}

export function buildImplementPlan(
  input: ImplementPlanInput,
): ImplementPlanResult {
  const devplan = input.source === 'devplan' ? (input.devplan ?? null) : null;
  const { nodes, edges } = collectGraph(input.stories, devplan);

  const rationaleFor = (node: CollectedNode): string => {
    if (node.kind === 'Story') return 'Story from stories-manifest';
    return 'Cross-story Task from devplan-manifest';
  };

  const leveling = assignLevels(nodes, edges, rationaleFor, input.max_parallel);

  const manifest: ImplementPlanManifest = {
    batch: input.batch,
    run_id: input.run_id,
    project_ref: input.project_ref,
    created_at: new Date().toISOString(),
    source_manifest: input.source,
    groups: leveling.groups,
    edges,
    cycles_broken: leveling.cycles_broken,
    unresolved: leveling.unresolved,
    degraded: input.source === 'stories',
  };

  return { manifest };
}
