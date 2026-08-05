/**
 * @file manifestValidator.ts
 * @description Schema + reference integrity validation for manifests
 */
import type {
  EstimationManifest,
  ManifestType,
  StoriesManifest,
} from '../../types/manifest.js';
import { findDuplicates } from '../../utils/index.js';
import { loadManifest } from '../manifestParser/index.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Validate a manifest file: schema, ID uniqueness, and reference integrity */
export async function validateManifest(
  runDir: string,
  type: ManifestType,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let manifest: StoriesManifest | EstimationManifest;
  try {
    if (type === 'stories') manifest = await loadManifest(runDir, 'stories');
    else manifest = await loadManifest(runDir, 'estimation');
  } catch (err) {
    return {
      valid: false,
      errors: [`Schema validation failed: ${(err as Error).message}`],
      warnings: [],
    };
  }

  if (type === 'stories')
    validateStoriesManifest(manifest as StoriesManifest, errors, warnings);
  else
    validateEstimationManifest(
      manifest as EstimationManifest,
      errors,
      warnings,
    );

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
  for (const dup of duplicates) errors.push(`Duplicate story ID: "${dup}"`);

  const idSet = new Set(ids);

  // Link reference integrity
  for (const link of manifest.links) {
    if (!idSet.has(link.from))
      errors.push(`Link references unknown source ID: "${link.from}"`);

    for (const to of link.to)
      if (!idSet.has(to))
        errors.push(`Link references unknown target ID: "${to}"`);
  }

  // split_into reference integrity
  for (const story of manifest.stories) {
    for (const ref of story.split_into)
      if (!idSet.has(ref))
        warnings.push(
          `Story "${story.id}" split_into references unknown ID: "${ref}"`,
        );

    if (story.split_from !== null && !idSet.has(story.split_from))
      warnings.push(
        `Story "${story.id}" split_from references unknown ID: "${story.split_from}"`,
      );
  }
}

// --- Estimation validation ---

function validateEstimationManifest(
  manifest: EstimationManifest,
  errors: string[],
  warnings: string[],
): void {
  // Unit ID uniqueness
  const ids = manifest.units.map((u) => u.id);
  for (const dup of findDuplicates(ids))
    errors.push(`Duplicate unit ID: "${dup}"`);

  const idSet = new Set(ids);

  // deps reference integrity
  for (const unit of manifest.units)
    for (const dep of unit.deps)
      if (!idSet.has(dep))
        errors.push(`Unit "${unit.id}" deps references unknown ID: "${dep}"`);

  // schedule tracks: every referenced unit exists, no unit scheduled twice
  const scheduled = new Map<string, number>();
  for (const track of manifest.schedule.tracks)
    for (const unitId of track.units) {
      if (!idSet.has(unitId))
        errors.push(
          `Schedule track ${track.track} references unknown unit: "${unitId}"`,
        );
      const prev = scheduled.get(unitId);
      if (prev !== undefined)
        errors.push(
          `Unit "${unitId}" is scheduled in multiple tracks: ${prev} and ${track.track}`,
        );
      else scheduled.set(unitId, track.track);
    }

  // milestones within the schedule horizon
  for (const milestone of manifest.schedule.milestones)
    if (milestone.week > manifest.schedule.total_weeks)
      warnings.push(
        `Milestone "${milestone.name}" (week ${milestone.week}) is beyond total_weeks ${manifest.schedule.total_weeks}`,
      );

  // risks reference known units
  for (const risk of manifest.risks)
    if (!idSet.has(risk.unit))
      warnings.push(`Risk references unknown unit: "${risk.unit}"`);

  // confidence interval sanity
  const [lo, hi] = manifest.rollup.confidence_interval;
  if (lo > hi)
    errors.push(
      `rollup.confidence_interval is inverted: [${lo}, ${hi}] — lower bound exceeds upper bound`,
    );
}
