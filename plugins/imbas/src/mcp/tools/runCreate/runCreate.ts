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

export interface RunCreateInput {
  project_ref: string;
  source_file: string;
  supplements?: string[];
  source_issue_ref?: string;
  project_root?: string;
}

export async function handleRunCreate(input: RunCreateInput) {
  const cwd = projectRoot(input.project_root);
  const runsDir = getRunsDir(cwd, input.project_ref);

  const run_id = generateRunId(runsDir);
  const run_dir = join(runsDir, run_id);

  mkdirSync(run_dir, { recursive: true });

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
