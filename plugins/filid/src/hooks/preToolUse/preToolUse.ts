import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { HOOK_TOOL_NAME } from '../../constants/hookDefaults.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import { isDetailMd } from '../shared/utils/isDetailMd.js';
import { isFcaProject } from '../shared/utils/isFcaProject.js';
import { validateCwd } from '../utils/validateCwd.js';

import { processVisit } from './helpers/intentInjector/intentInjector.js';
import { validatePreToolUse } from './helpers/preToolValidator/preToolValidator.js';
import { guardStructure } from './helpers/structureGuard/structureGuard.js';
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
 * Branch names and criteria ledgers do not affect hook permission decisions.
 */
export async function handlePreToolUse(
  input: PreToolUseInput,
): Promise<HookOutput> {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };
  if (!isFcaProject(safeCwd)) return { continue: true };

  const mutation =
    input.tool_name === HOOK_TOOL_NAME.WRITE ||
    input.tool_name === HOOK_TOOL_NAME.EDIT;

  const visit = processVisit(input);
  if (!mutation) return mergeResults([visit]);

  if (visit.hookSpecificOutput?.permissionDecision === 'deny')
    return mergeResults([visit]);

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  let oldContent: string | undefined;
  if (isDetailMd(filePath))
    try {
      oldContent = readFileSync(resolve(safeCwd, filePath), 'utf-8');
    } catch {
      /* new file */
    }

  return mergeResults([
    visit,
    validatePreToolUse(input, oldContent),
    guardStructure(input),
  ]);
}
