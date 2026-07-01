import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import { isCriteriaMd, isDetailMd, isIntentMd } from '../shared/shared.js';
import { isSpikeBranch } from '../utils/isSpikeBranch.js';
import { readCurrentBranch } from '../utils/readCurrentBranch.js';
import { validateCwd } from '../utils/validateCwd.js';

import { injectIntent } from './helpers/intentInjector/intentInjector.js';
import { validatePreToolUse } from './helpers/preToolValidator/preToolValidator.js';
import { guardStructure } from './helpers/structureGuard/structureGuard.js';
import { auditDocDecision } from './utils/auditDocDecision.js';
import { mergeResults } from './utils/mergeResults.js';

/**
 * Unified PreToolUse hook orchestrator.
 * Runs intent injection for Read,
 * plus validation and structure guard for Write|Edit only.
 *
 * Spike mode (current branch matches `spike/*` — branch name is the single
 * authority, read fresh per event) suspends the doc-hygiene denies for
 * INTENT.md/DETAIL.md. criteria.md validation is never suspended. Every
 * doc-contract judgment is appended to the mode audit trail.
 */
export async function handlePreToolUse(
  input: PreToolUseInput,
): Promise<HookOutput> {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };

  const results: HookOutput[] = [];

  // 1. INTENT.md context injection (Read)
  if (input.tool_name === 'Read') results.push(injectIntent(input));

  // 2. Write|Edit-only validation
  if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
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
    const spikeMode = docTarget && isSpikeBranch(readCurrentBranch(safeCwd));
    const spikeExempt =
      spikeMode && (isIntentMd(filePath) || isDetailMd(filePath));

    results.push(validatePreToolUse(input, oldContent, spikeExempt));
    results.push(guardStructure(input));

    const merged = mergeResults(results);
    if (docTarget)
      auditDocDecision(safeCwd, input, filePath, merged, spikeMode);
    return merged;
  }

  return mergeResults(results);
}
