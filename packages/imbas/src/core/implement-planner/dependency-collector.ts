/**
 * @file dependency-collector.ts
 * @description Collect DAG nodes (Story/Task) and edges from stories/devplan manifests
 */

import type {
  StoriesManifest,
  DevplanManifest,
  BatchEdge,
  BatchItemKind,
} from '../../types/manifest.js';

export interface CollectedNode {
  id: string;
  kind: BatchItemKind;
  issue_ref: string | null;
}

export interface CollectedGraph {
  nodes: CollectedNode[];
  edges: BatchEdge[];
}

export function collectGraph(
  stories: StoriesManifest,
  devplan: DevplanManifest | null,
): CollectedGraph {
  const nodes = collectNodes(stories, devplan);
  const idSet = new Set(nodes.map((n) => n.id));
  const edges: BatchEdge[] = [];

  for (const link of stories.links) {
    if (link.type !== 'blocks' && link.type !== 'is-blocked-by') continue;
    for (const toId of link.to) {
      const [from, to] =
        link.type === 'blocks' ? [link.from, toId] : [toId, link.from];
      if (!idSet.has(from) || !idSet.has(to)) continue;
      edges.push({ from, to, source: 'story_link', weight: 1 });
    }
  }

  if (devplan) {
    for (const task of devplan.tasks) {
      if (!idSet.has(task.id)) continue;
      for (const blockedId of task.blocks) {
        if (!idSet.has(blockedId)) continue;
        edges.push({
          from: task.id,
          to: blockedId,
          source: 'task_blocks',
          weight: 2,
        });
      }
    }
  }

  return { nodes, edges };
}

function collectNodes(
  stories: StoriesManifest,
  devplan: DevplanManifest | null,
): CollectedNode[] {
  const nodes: CollectedNode[] = [];
  for (const story of stories.stories) {
    nodes.push({ id: story.id, kind: 'Story', issue_ref: story.issue_ref });
  }
  if (devplan) {
    for (const task of devplan.tasks) {
      nodes.push({ id: task.id, kind: 'Task', issue_ref: task.issue_ref });
    }
  }
  return nodes;
}
