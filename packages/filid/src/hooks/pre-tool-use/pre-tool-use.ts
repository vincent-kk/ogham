import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import { isDetailMd } from '../shared/shared.js';
import { validateCwd } from '../utils/validate-cwd.js';

import { injectIntent } from './helpers/intent-injector/intent-injector.js';
import { validatePreToolUse } from './helpers/pre-tool-validator';
import { guardStructure } from './helpers/structure-guard/structure-guard.js';
import { mergeResults } from './utils/merge-results.js';

/**
 * Unified PreToolUse hook orchestrator.
 * Runs intent injection for Read,
 * plus validation and structure guard for Write|Edit only.
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
    let oldDetailContent: string | undefined;
    if (isDetailMd(filePath)) {
      try {
        oldDetailContent = readFileSync(resolve(safeCwd, filePath), 'utf-8');
      } catch {
        /* new file */
      }
    }
    results.push(validatePreToolUse(input, oldDetailContent));
    results.push(guardStructure(input));
  }

  return mergeResults(results);
}
