import { initProject } from '../../../../core/infra/configLoader/index.js';
import type { InitResult } from '../../../../core/infra/configLoader/index.js';

/** Configuration fields consumed by the initialization child. */
export interface ProjectInitInput {
  path: string;
  /**
   * Output language name (English name, e.g. `'Korean'`). Threaded into the
   * freshly created `.filid/config.json`; omit for English.
   */
  language?: string;
  /** Adapter IDs to enable explicitly. Omit to use automatic detection. */
  adapterIds?: string[];
}

/**
 * Handle the `project_setup` initialization action.
 *
 * Initializes FCA-AI project infrastructure — config only:
 * - Creates .filid/config.json with default rule configuration.
 *
 * Rule doc deployment (`.claude/rules/*.md`) is NOT performed here; the
 * setup skill drives that through the `rules-sync` action so users
 * always make an explicit checkbox choice about optional rule files.
 *
 * Existing config.json is never overwritten.
 */
export function handleProjectInit(args: unknown): InitResult {
  const input = args as ProjectInitInput;

  if (!input.path) throw new Error('path is required');

  return initProject(input.path, {
    language: input.language,
    adapterIds: input.adapterIds,
  });
}
