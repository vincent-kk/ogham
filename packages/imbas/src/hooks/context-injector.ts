import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMBAS_ROOT_DIRNAME, CONFIG_FILENAME, RUNS_DIRNAME, STATE_FILENAME } from '../constants/index.js';
import type { HookOutput, UserPromptSubmitInput } from '../types/hooks.js';

export function processContextInjector(input: UserPromptSubmitInput): HookOutput {
  // Inject active run context into user prompts
  const { cwd } = input;
  const imbasRoot = join(cwd, IMBAS_ROOT_DIRNAME);

  if (!existsSync(imbasRoot)) {
    return { continue: true };
  }

  // Try to find active run
  try {
    const configPath = join(imbasRoot, CONFIG_FILENAME);
    if (!existsSync(configPath)) return { continue: true };

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const projectKey = config?.defaults?.project_ref;
    if (!projectKey) return { continue: true };

    const runsDir = join(imbasRoot, projectKey, RUNS_DIRNAME);
    if (!existsSync(runsDir)) return { continue: true };

    const runs = readdirSync(runsDir).sort().reverse();
    if (runs.length === 0) return { continue: true };

    const latestRun = runs[0];
    const statePath = join(runsDir, latestRun, STATE_FILENAME);
    if (!existsSync(statePath)) return { continue: true };

    const state = JSON.parse(readFileSync(statePath, 'utf-8'));
    const phase = state.current_phase || 'unknown';
    const phaseStatus = state.phases?.[phase]?.status || 'unknown';

    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `[imbas] Active run: ${latestRun} (project: ${projectKey}, phase: ${phase}, status: ${phaseStatus}). Use /imbas:status for details.`,
      },
    };
  } catch {
    return { continue: true };
  }
}
