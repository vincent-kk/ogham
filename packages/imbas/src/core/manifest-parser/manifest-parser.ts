/**
 * @file core/manifest-parser.ts
 * @description Manifest loading + summary generation
 * @see `agents/planner.md` (stories-manifest), `agents/engineer.md` (devplan-manifest)
 */

import { join } from 'node:path';
import { readJson } from '../../lib/file-io.js';
import { MANIFEST_FILE_MAP } from '../../constants/index.js';
import {
  StoriesManifestSchema,
  DevplanManifestSchema,
  ImplementPlanManifestSchema,
} from '../../types/manifest.js';
import type {
  StoriesManifest,
  DevplanManifest,
  ImplementPlanManifest,
  ManifestSummary,
  ImplementPlanSummary,
} from '../../types/manifest.js';

export type ManifestType = 'stories' | 'devplan' | 'implement-plan';

/** Load and validate a manifest file from runDir */
export async function loadManifest(
  runDir: string,
  type: 'stories',
): Promise<StoriesManifest>;
export async function loadManifest(
  runDir: string,
  type: 'devplan',
): Promise<DevplanManifest>;
export async function loadManifest(
  runDir: string,
  type: 'implement-plan',
): Promise<ImplementPlanManifest>;
export async function loadManifest(
  runDir: string,
  type: ManifestType,
): Promise<StoriesManifest | DevplanManifest | ImplementPlanManifest> {
  const filename = MANIFEST_FILE_MAP[type];
  const filePath = join(runDir, filename);

  if (type === 'stories') {
    const raw = await readJson(filePath, StoriesManifestSchema);
    return raw as StoriesManifest;
  }
  if (type === 'devplan') {
    const raw = await readJson(filePath, DevplanManifestSchema);
    return raw as DevplanManifest;
  }
  const raw = await readJson(filePath, ImplementPlanManifestSchema);
  return raw as ImplementPlanManifest;
}

/** Generate a ManifestSummary from a loaded stories or devplan manifest */
export function getManifestSummary(
  manifest: StoriesManifest | DevplanManifest,
): ManifestSummary {
  const items = collectItems(manifest);
  return {
    total: items.length,
    pending: items.filter((s) => s === 'pending').length,
    created: items.filter((s) => s === 'created').length,
    failed: items.filter((s) => s === 'failed').length,
  };
}

/** Generate a summary from a loaded implement-plan manifest */
export function getImplementPlanSummary(
  manifest: ImplementPlanManifest,
): ImplementPlanSummary {
  let totalItems = 0;
  let maxLevel = -1;
  for (const group of manifest.groups) {
    totalItems += group.items.length;
    if (group.level > maxLevel) maxLevel = group.level;
  }
  return {
    total_groups: manifest.groups.length,
    total_items: totalItems,
    max_level: maxLevel < 0 ? 0 : maxLevel,
    unresolved: manifest.unresolved.length,
    cycles_broken: manifest.cycles_broken.length,
    degraded: manifest.degraded,
  };
}

// --- Helpers ---

function collectItems(manifest: StoriesManifest | DevplanManifest): string[] {
  const statuses: string[] = [];

  if ('stories' in manifest) {
    // StoriesManifest
    for (const story of manifest.stories) {
      statuses.push(story.status);
    }
  } else {
    // DevplanManifest
    for (const task of manifest.tasks) {
      statuses.push(task.status);
      for (const subtask of task.subtasks) {
        statuses.push(subtask.status);
      }
    }
    for (const ss of manifest.story_subtasks) {
      for (const subtask of ss.subtasks) {
        statuses.push(subtask.status);
      }
    }
    for (const fc of manifest.feedback_comments) {
      statuses.push(fc.status);
    }
  }

  return statuses;
}
