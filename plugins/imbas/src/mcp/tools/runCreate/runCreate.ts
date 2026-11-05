/**
 * @file runCreate.ts
 * @description Create run directory and initial state.json
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import { projectRoot } from '@ogham/cross-platform';

import {
  SOURCE_FILENAME,
  SUPPLEMENTS_DIRNAME,
} from '../../../constants/index.js';
import { getRunsDir } from '../../../core/paths/index.js';
import { generateRunId } from '../../../core/runIdGenerator/index.js';
import {
  createRunState,
  saveRunState,
} from '../../../core/stateManager/index.js';

/** Transport arguments identifying the project and files to copy into a new run. */
export interface RunCreateInput {
  /** Project reference resolved to an isolated run directory. */
  project_ref: string;
  /** Existing source document copied after the run ID is reserved. */
  source_file: string;
  /** Additional source files copied under their basenames. */
  supplements?: string[];
  /** Optional tracker reference retained in the initial state. */
  source_issue_ref?: string;
  /** Absolute workspace root when the host is not running in the workspace. */
  project_root?: string;
}

/**
 * Reserve a run, copy its input documents, and persist the initial state.
 * @param input Project identity and existing source paths for the new run.
 * @returns The reserved ID, directory, and saved initial state.
 * @throws On path, reservation, copy, or state-write failure; a reservation can remain.
 */
export async function handleRunCreate(input: RunCreateInput) {
  const cwd = projectRoot(input.project_root);
  const runsDir = getRunsDir(cwd, input.project_ref);

  const run_id = generateRunId(runsDir);
  const run_dir = join(runsDir, run_id);

  // Copy source file
  const destSource = join(run_dir, SOURCE_FILENAME);
  copyFileSync(input.source_file, destSource);

  // Copy supplements
  if (input.supplements && input.supplements.length > 0) {
    const suppDir = join(run_dir, SUPPLEMENTS_DIRNAME);
    mkdirSync(suppDir, { recursive: true });
    for (const supp of input.supplements)
      copyFileSync(supp, join(suppDir, basename(supp)));
  }

  // Create initial state
  const state = createRunState({
    run_id,
    project_ref: input.project_ref,
    source_file: input.source_file,
    source_issue_ref: input.source_issue_ref,
  });
  await saveRunState(run_dir, state);

  return { run_id, run_dir, state };
}
