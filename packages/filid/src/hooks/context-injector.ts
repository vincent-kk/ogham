/**
 * context-injector.ts — UserPromptSubmit hook for FCA-AI context injection.
 *
 * Layer Architecture:
 *
 * Layer 1 (SessionStart hook) — NOT IMPLEMENTED
 *   - Role: Prepare context assets at session start (e.g., compute fractal tree)
 *   - Would write: {cwdHash}/context-text  (plain text, pre-computed content)
 *   - Integration point: hooks/entries/session-start.entry.ts (future)
 *   - Status: Architecture reserved, content unspecified, implementation deferred
 *
 * Layer 2 (UserPromptSubmit hook) — THIS FILE
 *   - Role: Inject FCA-AI rules + fractal structure rules on session's first prompt
 *   - Session gate: session-context-{sessionIdHash} marker file in cache directory
 *   - Cache: per-session prompt-context-{sessionIdHash} file
 *
 * Cache functions are provided by src/core/cache-manager.ts.
 */
import {
  hasPromptContext,
  isFirstInSession,
  markSessionInjected,
  writePromptContext,
} from '../core/infra/cache-manager.js';
import { getActiveRules, loadBuiltinRules } from '../core/rules/rule-engine.js';
import type { HookOutput, UserPromptSubmitInput } from '../types/hooks.js';

import { isFcaProject } from './shared.js';

const CATEGORY_GUIDE = [
  '- fractal: independent module with INTENT.md or DETAIL.md',
  '- organ: leaf directory with no fractal children',
  '- pure-function: collection of pure functions with no side effects',
  '- hybrid: transitional node with both fractal and organ characteristics',
].join('\n');

/**
 * Builds the FCA-AI rules text to inject into Claude's context.
 */
function buildFcaContext(cwd: string): string {
  return [
    `[FCA-AI] Active in: ${cwd}`,
    'Rules:',
    '- INTENT.md: max 50 lines, must include 3-tier boundary sections',
    '- DETAIL.md: no append-only growth, must restructure on updates',
    '- Organ directories (auto-classified by structure analysis) must NOT have INTENT.md',
    '- Test files: max 15 cases per spec.ts (3 basic + 12 complex)',
    '- LCOM4 >= 2 → split module, CC > 15 → compress/abstract',
    '',
    'Directory Structure:',
    '- New module → must create INTENT.md (3-tier boundaries) + index.ts (barrel export)',
    '- Leaf utility dirs (components/, utils/, types/) → organ: no INTENT.md, keep flat',
    '- Shared code → place at nearest common ancestor (LCA) of its consumers',
    "- No direct imports between siblings → route through parent's public interface",
    '- Use /filid:fca-scan to detect violations, /filid:fca-sync to fix structural drift',
    '',
    'Development Workflow:',
    '- When planning, include INTENT.md/DETAIL.md updates for affected fractal modules',
    '- Update DETAIL.md (requirements) BEFORE code, INTENT.md when boundaries change',
  ].join('\n');
}

/**
 * UserPromptSubmit hook: inject FCA-AI context reminders.
 *
 * Injects FCA-AI rules only on the first prompt of each session.
 * Subsequent prompts return { continue: true } immediately.
 *
 * Never blocks user prompts (always continue: true).
 */
export function injectContext(input: UserPromptSubmitInput): HookOutput {
  const { cwd, session_id } = input;

  // Gate 1: skip if not an FCA-AI project
  if (!isFcaProject(cwd)) {
    return { continue: true };
  }

  // Gate 2: skip only when both session marker AND prompt-context exist
  if (!isFirstInSession(session_id, cwd) && hasPromptContext(session_id, cwd)) {
    return { continue: true };
  }

  // Step 1: FCA-AI rules (always included)
  const fcaContext = buildFcaContext(cwd);

  // Step 2: fractal rules section (rule list + category guide only, no scan)
  let fractalSection = '';
  try {
    const rules = getActiveRules(loadBuiltinRules());
    const rulesText = rules
      .map((r) => `- ${r.id}: ${r.description}`)
      .join('\n');

    fractalSection = [
      '',
      '[filid] Fractal Structure Rules:',
      rulesText,
      '',
      'Category Classification:',
      CATEGORY_GUIDE,
    ].join('\n');
  } catch {
    // on rule load failure, omit fractal section and return FCA-AI rules only
  }

  const additionalContext = (fcaContext + fractalSection).trim();

  // persist cache and record session marker
  writePromptContext(cwd, additionalContext, session_id);
  markSessionInjected(session_id, cwd);

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  };
}
