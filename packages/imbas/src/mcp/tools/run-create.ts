/**
 * @file run-create.ts
 * @description Create run directory and initial state.json
 */

import { mkdirSync, copyFileSync } from 'node:fs';
import { join, basename } from 'node:path';

import { getProjectDir, getRunDir } from '../../core/paths.js';
import { generateRunId } from '../../core/run-id-generator.js';
import { createRunState, saveRunState } from '../../core/state-manager.js';

export interface RunCreateInput {
  project_key: string;
  source_file: string;
  supplements?: string[];
}

export async function handleRunCreate(input: RunCreateInput) {
  const cwd = process.cwd();
  const projectDir = getProjectDir(cwd, input.project_key);
  const runsDir = join(projectDir, 'runs');

  const run_id = generateRunId(runsDir);
  const run_dir = getRunDir(cwd, input.project_key, run_id);

  mkdirSync(run_dir, { recursive: true });

  // Copy source file
  const destSource = join(run_dir, 'source.md');
  copyFileSync(input.source_file, destSource);

  // Copy supplements
  if (input.supplements && input.supplements.length > 0) {
    const suppDir = join(run_dir, 'supplements');
    mkdirSync(suppDir, { recursive: true });
    for (const supp of input.supplements) {
      copyFileSync(supp, join(suppDir, basename(supp)));
    }
  }

  // Create initial state
  const state = createRunState({
    run_id,
    project_key: input.project_key,
    source_file: input.source_file,
  });
  await saveRunState(run_dir, state);

  return { run_id, run_dir, state };
}
