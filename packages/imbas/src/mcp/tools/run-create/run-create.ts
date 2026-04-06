/**
 * @file run-create.ts
 * @description Create run directory and initial state.json
 */

import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

import { getRunsDir } from '../../../core/paths/paths.js';
import { generateRunId } from '../../../core/run-id-generator/run-id-generator.js';
import { createRunState, saveRunState } from '../../../core/state-manager/state-manager.js';
import { SOURCE_FILENAME, SUPPLEMENTS_DIRNAME, DEVPLAN_PIPELINE_SOURCE } from '../../../constants/index.js';

export interface RunCreateInput {
  project_ref: string;
  source_file: string;
  supplements?: string[];
  source_issue_ref?: string;
}

export async function handleRunCreate(input: RunCreateInput) {
  const cwd = process.cwd();
  const runsDir = getRunsDir(cwd, input.project_ref);

  const run_id = generateRunId(runsDir);
  const run_dir = join(runsDir, run_id);

  mkdirSync(run_dir, { recursive: true });

  // Copy source file — or create placeholder for devplan-pipeline mode
  const destSource = join(run_dir, SOURCE_FILENAME);
  if (input.source_file === DEVPLAN_PIPELINE_SOURCE) {
    writeFileSync(destSource, '', 'utf-8');
  } else {
    copyFileSync(input.source_file, destSource);
  }

  // Copy supplements
  if (input.supplements && input.supplements.length > 0) {
    const suppDir = join(run_dir, SUPPLEMENTS_DIRNAME);
    mkdirSync(suppDir, { recursive: true });
    for (const supp of input.supplements) {
      copyFileSync(supp, join(suppDir, basename(supp)));
    }
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
