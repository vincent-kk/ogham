import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HookOutput, UserPromptSubmitInput } from '../types/hooks.js';

export function processContextInjector(input: UserPromptSubmitInput): HookOutput {
  // Inject active run context into user prompts
  const { cwd } = input;
  const imbasRoot = join(cwd, '.imbas');

  if (!existsSync(imbasRoot)) {
    return { continue: true };
  }

  // Try to find active run
  try {
    const configPath = join(imbasRoot, 'config.json');
    if (!existsSync(configPath)) return { continue: true };

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const projectKey = config?.defaults?.project_key;
    if (!projectKey) return { continue: true };

    const runsDir = join(imbasRoot, projectKey, 'runs');
    if (!existsSync(runsDir)) return { continue: true };

    const runs = readdirSync(runsDir).sort().reverse();
    if (runs.length === 0) return { continue: true };

    const latestRun = runs[0];
    const statePath = join(runsDir, latestRun, 'state.json');
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
