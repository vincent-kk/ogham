/**
 * @file core/manifest-validator.ts
 * @description Schema + reference integrity validation for manifests
 */

import { loadManifest } from '../manifest-parser/manifest-parser.js';
import type { ManifestType } from '../manifest-parser/manifest-parser.js';
import { findDuplicates } from '../../utils/index.js';
import type {
  StoriesManifest,
  DevplanManifest,
  ImplementPlanManifest,
} from '../../types/manifest.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Validate a manifest file: schema, ID uniqueness, and link reference integrity */
export async function validateManifest(
  runDir: string,
  type: ManifestType,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let manifest: StoriesManifest | DevplanManifest | ImplementPlanManifest;
  try {
    if (type === 'stories') {
      manifest = await loadManifest(runDir, 'stories');
    } else if (type === 'devplan') {
      manifest = await loadManifest(runDir, 'devplan');
    } else {
      manifest = await loadManifest(runDir, 'implement-plan');
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
  } else if (type === 'devplan') {
    validateDevplanManifest(manifest as DevplanManifest, errors, warnings);
  } else {
    validateImplementPlanManifest(
      manifest as ImplementPlanManifest,
      errors,
      warnings,
    );
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

// --- Implement Plan validation ---

function validateImplementPlanManifest(
  manifest: ImplementPlanManifest,
  errors: string[],
  warnings: string[],
): void {
  const groupIds = manifest.groups.map((g) => g.group_id);
  for (const dup of findDuplicates(groupIds)) {
    errors.push(`Duplicate group_id: "${dup}"`);
  }

  const groupIdSet = new Set(groupIds);
  const itemIds: string[] = [];
  const itemIdToGroup = new Map<string, string>();

  for (const group of manifest.groups) {
    for (const item of group.items) {
      itemIds.push(item.id);
      const existing = itemIdToGroup.get(item.id);
      if (existing !== undefined) {
        errors.push(
          `Item "${item.id}" appears in multiple groups: "${existing}" and "${group.group_id}"`,
        );
      } else {
        itemIdToGroup.set(item.id, group.group_id);
      }
    }
    for (const depGroupId of group.depends_on_groups) {
      if (!groupIdSet.has(depGroupId)) {
        errors.push(
          `Group "${group.group_id}" depends_on_groups references unknown group: "${depGroupId}"`,
        );
      }
    }
  }

  const itemIdSet = new Set(itemIds);
  for (const edge of manifest.edges) {
    if (!itemIdSet.has(edge.from)) {
      warnings.push(`Edge from references unknown item: "${edge.from}"`);
    }
    if (!itemIdSet.has(edge.to)) {
      warnings.push(`Edge to references unknown item: "${edge.to}"`);
    }
  }

  // level monotonicity: a group's level must be > max level of its dependencies
  const levelByGroup = new Map(manifest.groups.map((g) => [g.group_id, g.level]));
  for (const group of manifest.groups) {
    for (const depGroupId of group.depends_on_groups) {
      const depLevel = levelByGroup.get(depGroupId);
      if (depLevel !== undefined && depLevel >= group.level) {
        errors.push(
          `Group "${group.group_id}" (level ${group.level}) depends on "${depGroupId}" (level ${depLevel}) — dependency must be at a strictly lower level`,
        );
      }
    }
  }
}

