import type { HookOutput, PreToolUseInput } from '../types/hooks.js';

import { isFcaProject } from './shared.js';

const PLAN_ENTRY_CHECKLIST = [
  '[FCA-AI Plan Compliance Checklist]',
  'While writing the plan, ensure it includes:',
  '1. INTENT.md/DETAIL.md updates for ALL affected fractal modules',
  '2. DETAIL.md updates BEFORE code changes (spec-driven)',
  '3. INTENT.md boundary updates if module responsibilities change',
  '4. New fractal modules: INTENT.md (max 50 lines, 3-tier) + DETAIL.md',
].join('\n');

/**
 * PreToolUse hook for EnterPlanMode: inject FCA-AI document update checklist.
 *
 * When planning starts (EnterPlanMode), this hook reminds Claude
 * to include INTENT.md/DETAIL.md update steps in the plan.
 *
 * Never blocks (always continue: true). Only injects context in FCA projects.
 */
export function injectPlanChecklist(input: PreToolUseInput): HookOutput {
  if (!isFcaProject(input.cwd)) {
    return { continue: true };
  }

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: PLAN_ENTRY_CHECKLIST,
    },
  };
}
