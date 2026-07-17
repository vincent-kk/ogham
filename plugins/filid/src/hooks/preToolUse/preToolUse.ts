import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import {
  isCriteriaMd,
  isDetailMd,
  isFcaProject,
  isIntentMd,
} from '../shared/shared.js';
import { isSpikeBranch } from '../utils/isSpikeBranch.js';
import { readCurrentBranch } from '../utils/readCurrentBranch.js';
import { validateCwd } from '../utils/validateCwd.js';

import { processVisit } from './helpers/intentInjector/intentInjector.js';
import { validatePreToolUse } from './helpers/preToolValidator/preToolValidator.js';
import { guardStructure } from './helpers/structureGuard/structureGuard.js';
import { auditDocDecision } from './utils/auditDocDecision.js';
import { mergeResults } from './utils/mergeResults.js';

/**
 * Unified PreToolUse hook orchestrator.
 * Read | Write | Edit all enter the visit pipeline (`processVisit`) first;
 * Write/Edit continue into validation and the structure guard.
 *
 * FCA opt-in gate: projects without a `.filid/` marker or INTENT.md are not
 * governed at all — validation and guards are as opt-in as injection.
 *
 * A visit-gate deny (undelivered-module mutation) short-circuits the
 * orchestration: the deny reason already delivered the module rules, and the
 * identical retry runs the full validator/guard path.
 *
 * Spike mode (current branch matches `spike/*` — branch name is the single
 * authority, read fresh per event) suspends the visit gate and the
 * doc-hygiene denies for INTENT.md/DETAIL.md. criteria.md validation is never
 * suspended. Every doc-contract judgment is appended to the mode audit trail.
 */
export async function handlePreToolUse(
  input: PreToolUseInput,
): Promise<HookOutput> {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };
  if (!isFcaProject(safeCwd)) return { continue: true };

  const mutation = input.tool_name === 'Write' || input.tool_name === 'Edit';
  const spikeMode = mutation && isSpikeBranch(readCurrentBranch(safeCwd));

  const visit = processVisit(input, spikeMode);
  if (!mutation) return mergeResults([visit]);

  if (visit.hookSpecificOutput?.permissionDecision === 'deny')
    return mergeResults([visit]);

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  let oldContent: string | undefined;
  if (isDetailMd(filePath) || isCriteriaMd(filePath))
    try {
      oldContent = readFileSync(resolve(safeCwd, filePath), 'utf-8');
    } catch {
      /* new file */
    }

  const docTarget =
    isIntentMd(filePath) || isDetailMd(filePath) || isCriteriaMd(filePath);
  const spikeExempt =
    spikeMode && (isIntentMd(filePath) || isDetailMd(filePath));

  const merged = mergeResults([
    visit,
    validatePreToolUse(input, oldContent, spikeExempt),
    guardStructure(input),
  ]);
  if (docTarget) auditDocDecision(safeCwd, input, filePath, merged, spikeMode);
  return merged;
}
