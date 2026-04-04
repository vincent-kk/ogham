/**
 * @file core/execution-planner.ts
 * @description Devplan execution order filtering — pending items only
 */

import type { DevplanManifest } from '../../types/manifest.js';

export interface ExecutionPlan {
  steps: Array<{
    step: number;
    action: string;
    items: string[];
    pending_count: number;
  }>;
  total_pending: number;
}

/**
 * Filter execution_order to only include items with status 'pending'.
 * Returns steps with pending items and a total pending count.
 */
export function planExecution(manifest: DevplanManifest): ExecutionPlan {
  // Build a set of pending item IDs for fast lookup
  const pendingIds = buildPendingIdSet(manifest);

  const steps: ExecutionPlan['steps'] = [];
  let totalPending = 0;

  for (const execStep of manifest.execution_order) {
    const pendingItems = execStep.items.filter((id) => pendingIds.has(id));
    if (pendingItems.length === 0) continue;

    steps.push({
      step: execStep.step,
      action: execStep.action,
      items: pendingItems,
      pending_count: pendingItems.length,
    });
    totalPending += pendingItems.length;
  }

  return { steps, total_pending: totalPending };
}

// --- Helpers ---

function buildPendingIdSet(manifest: DevplanManifest): Set<string> {
  const ids = new Set<string>();

  for (const task of manifest.tasks) {
    if (task.status === 'pending') ids.add(task.id);
    for (const subtask of task.subtasks) {
      if (subtask.status === 'pending') ids.add(subtask.id);
    }
  }

  for (const ss of manifest.story_subtasks) {
    for (const subtask of ss.subtasks) {
      if (subtask.status === 'pending') ids.add(subtask.id);
    }
  }

  for (const fc of manifest.feedback_comments) {
    if (fc.status === 'pending') ids.add(fc.target_story);
  }

  return ids;
}
