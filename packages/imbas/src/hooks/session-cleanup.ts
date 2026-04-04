import type { HookOutput, SessionEndInput } from '../types/hooks.js';

export function processSessionCleanup(_input: SessionEndInput): HookOutput {
  // Cleanup placeholder — no auto-deletion of temp files (user consent required)
  // Future: could log session summary or clean expired cache
  return { continue: true };
}
