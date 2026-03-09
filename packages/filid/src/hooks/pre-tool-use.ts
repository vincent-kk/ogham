import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { HookOutput, PreToolUseInput } from '../types/hooks.js';
import { injectIntent } from './intent-injector.js';
import { validatePreToolUse } from './pre-tool-validator.js';
import { isDetailMd } from './shared.js';
import { guardStructure } from './structure-guard.js';

/**
 * Unified PreToolUse hook orchestrator.
 * Runs intent injection for all tools (Read|Write|Edit),
 * plus validation and structure guard for Write|Edit only.
 */
export async function handlePreToolUse(input: PreToolUseInput): Promise<HookOutput> {
  const results: HookOutput[] = [];

  // 1. INTENT.md context injection (Read|Write|Edit)
  results.push(injectIntent(input));

  // 2. Write|Edit-only validation
  if (input.tool_name === 'Write' || input.tool_name === 'Edit') {
    const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';
    let oldDetailContent: string | undefined;
    if (isDetailMd(filePath)) {
      try {
        oldDetailContent = readFileSync(resolve(input.cwd, filePath), 'utf-8');
      } catch { /* new file */ }
    }
    results.push(validatePreToolUse(input, oldDetailContent));
    results.push(guardStructure(input));
  }

  return mergeResults(results);
}

/**
 * Merge multiple HookOutput results:
 * - continue: AND (all must be true)
 * - additionalContext: concatenate non-empty with \n\n
 * - On block (continue=false): use first blocker's output
 */
export function mergeResults(results: HookOutput[]): HookOutput {
  let combinedContinue = true;
  const contexts: string[] = [];
  let blockOutput: HookOutput['hookSpecificOutput'] | undefined;

  for (const r of results) {
    if (r.continue === false) {
      combinedContinue = false;
      if (!blockOutput && r.hookSpecificOutput) {
        blockOutput = r.hookSpecificOutput;
      }
    }
    const ctx = r.hookSpecificOutput?.additionalContext;
    if (ctx) {
      contexts.push(ctx);
    }
  }

  if (!combinedContinue) {
    return {
      continue: false,
      hookSpecificOutput: blockOutput ?? {
        additionalContext: contexts.join('\n\n'),
      },
    };
  }

  if (contexts.length > 0) {
    return {
      continue: true,
      hookSpecificOutput: {
        additionalContext: contexts.join('\n\n'),
      },
    };
  }

  return { continue: true };
}
