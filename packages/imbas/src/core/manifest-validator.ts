/**
 * @file core/manifest-validator.ts
 * @description Schema + reference integrity validation for manifests
 */

import { loadManifest } from './manifest-parser.js';
import { findDuplicates } from '../utils/index.js';
import type { StoriesManifest, DevplanManifest } from '../types/manifest.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Validate a manifest file: schema, ID uniqueness, and link reference integrity */
export async function validateManifest(
  runDir: string,
  type: 'stories' | 'devplan',
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let manifest: StoriesManifest | DevplanManifest;
  try {
    if (type === 'stories') {
      manifest = await loadManifest(runDir, 'stories');
    } else {
      manifest = await loadManifest(runDir, 'devplan');
    }
  } catch (err) {
    return {
      valid: false,
      errors: [`Schema validation failed: ${(err as Error).message}`],
      warnings: [],
    };
  }

  if (type === 'stories') {
    validateStoriesManifest(manifest as StoriesManifest, errors, warnings);
  } else {
    validateDevplanManifest(manifest as DevplanManifest, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// --- Stories validation ---

function validateStoriesManifest(
  manifest: StoriesManifest,
  errors: string[],
  warnings: string[],
): void {
  // ID uniqueness
  const ids = manifest.stories.map((s) => s.id);
  const duplicates = findDuplicates(ids);
  for (const dup of duplicates) {
    errors.push(`Duplicate story ID: "${dup}"`);
  }

  const idSet = new Set(ids);

  // Link reference integrity
  for (const link of manifest.links) {
    if (!idSet.has(link.from)) {
      errors.push(`Link references unknown source ID: "${link.from}"`);
    }
    for (const to of link.to) {
      if (!idSet.has(to)) {
        errors.push(`Link references unknown target ID: "${to}"`);
      }
    }
  }

  // split_into reference integrity
  for (const story of manifest.stories) {
    for (const ref of story.split_into) {
      if (!idSet.has(ref)) {
        warnings.push(
          `Story "${story.id}" split_into references unknown ID: "${ref}"`,
        );
      }
    }
    if (story.split_from !== null && !idSet.has(story.split_from)) {
      warnings.push(
        `Story "${story.id}" split_from references unknown ID: "${story.split_from}"`,
      );
    }
  }
}

// --- Devplan validation ---

function validateDevplanManifest(
  manifest: DevplanManifest,
  errors: string[],
  warnings: string[],
): void {
  // Collect all item IDs
  const taskIds = manifest.tasks.map((t) => t.id);
  const subtaskIds = manifest.tasks.flatMap((t) => t.subtasks.map((s) => s.id));
  const storySubtaskIds = manifest.story_subtasks.flatMap((ss) =>
    ss.subtasks.map((s) => s.id),
  );

  // ID uniqueness within each collection
  for (const dup of findDuplicates(taskIds)) {
    errors.push(`Duplicate task ID: "${dup}"`);
  }
  for (const dup of findDuplicates(subtaskIds)) {
    errors.push(`Duplicate task subtask ID: "${dup}"`);
  }
  for (const dup of findDuplicates(storySubtaskIds)) {
    errors.push(`Duplicate story subtask ID: "${dup}"`);
  }

  const allIds = new Set([...taskIds, ...subtaskIds, ...storySubtaskIds]);

  // execution_order items reference valid IDs
  for (const step of manifest.execution_order) {
    for (const item of step.items) {
      if (!allIds.has(item)) {
        errors.push(
          `execution_order step ${step.step} references unknown ID: "${item}"`,
        );
      }
    }
  }

  // task.blocks reference valid IDs
  const taskIdSet = new Set(taskIds);
  for (const task of manifest.tasks) {
    for (const blockRef of task.blocks) {
      if (!taskIdSet.has(blockRef)) {
        warnings.push(
          `Task "${task.id}" blocks references unknown task ID: "${blockRef}"`,
        );
      }
    }
  }
}

