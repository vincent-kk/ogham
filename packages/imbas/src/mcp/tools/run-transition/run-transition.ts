/**
 * @file run-transition.ts
 * @description Typed phase transition (start/complete/escape)
 */

import { getRunDir } from '../../../core/paths/paths.js';
import { loadRunState, saveRunState, applyTransition } from '../../../core/state-manager/state-manager.js';
import { RunTransitionSchema, type RunTransition } from '../../../types/state.js';

export async function handleRunTransition(input: unknown) {
  // Per-action validation lives here, not at the MCP boundary. The MCP
  // inputSchema is flat leaf-primitive to avoid zod-to-json-schema $ref
  // emission; RunTransitionSchema.parse() enforces the discriminated-union
  // contract. Throws on invalid input → wrapHandler surfaces MCP isError.
  const parsed: RunTransition = RunTransitionSchema.parse(input);

  const cwd = process.cwd();
  const run_dir = getRunDir(cwd, parsed.project_ref, parsed.run_id);

  const state = await loadRunState(run_dir);
  const updated = applyTransition(state, parsed);
  await saveRunState(run_dir, updated);

  return updated;
}
