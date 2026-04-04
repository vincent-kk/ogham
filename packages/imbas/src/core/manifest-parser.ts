/**
 * @file core/manifest-parser.ts
 * @description Manifest loading + summary generation
 * @see agents/imbas-planner.md (stories-manifest), agents/imbas-engineer.md (devplan-manifest)
 */

import { join } from 'node:path';
import { readJson } from '../lib/file-io.js';
import { MANIFEST_FILE_MAP } from '../constants/index.js';
import {
  StoriesManifestSchema,
  DevplanManifestSchema,
} from '../types/manifest.js';
import type {
  StoriesManifest,
  DevplanManifest,
  ManifestSummary,
} from '../types/manifest.js';

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
  type: 'stories' | 'devplan',
): Promise<StoriesManifest | DevplanManifest> {
  const filename = MANIFEST_FILE_MAP[type];
  const filePath = join(runDir, filename);

  if (type === 'stories') {
    const raw = await readJson(filePath, StoriesManifestSchema);
    return raw as StoriesManifest;
  }
  const raw = await readJson(filePath, DevplanManifestSchema);
  return raw as DevplanManifest;
}

/** Generate a ManifestSummary from a loaded manifest */
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
