/**
 * context-injector.ts — UserPromptSubmit hook for FCA-AI context injection.
 *
 * Injects a minimal FCA-AI pointer on the session's first prompt.
 * Full rules are in .claude/rules/fca.md (deployed by setup.ts at SessionStart).
 *
 * Cache functions are provided by src/core/cache-manager.ts.
 */
import {
  hasPromptContext,
  isFirstInSession,
  markSessionInjected,
  writePromptContext,
} from '../../core/infra/cache-manager/cache-manager.js';
import {
  loadConfig,
  resolveLanguage,
} from '../../core/infra/config-loader/config-loader.js';
import { loadBuiltinRules } from '../../core/rules/rule-engine/rule-engine.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';

import { isFcaProject } from '../shared/shared.js';
import { validateCwd } from '../utils/validate-cwd.js';

/**
 * Build minimal FCA-AI context: a pointer to the rules file + any disabled rules.
 */
function buildMinimalContext(cwd: string): string {
  const lines: string[] = [
    '[filid] FCA-AI active. Rules: .claude/rules/fca.md',
  ];

  try {
    const config = loadConfig(cwd);
    const lang = resolveLanguage(config);
    lines.push(`[filid:lang] ${lang}`);

    const overrides = config?.rules ?? {};
    const allRules = loadBuiltinRules(overrides, config?.['additional-allowed']);
    const disabledRules = allRules.filter((r) => !r.enabled);
    if (disabledRules.length > 0) {
      lines.push(
        `[filid] Disabled rules: ${disabledRules.map((r) => r.id).join(', ')}`,
      );
    }
  } catch {
    // on rule load failure, still inject default language
    lines.push('[filid:lang] en');
  }

  return lines.join('\n');
}

/**
 * UserPromptSubmit hook: inject minimal FCA-AI context pointer.
 *
 * Injects on the first prompt of each session only.
 * Subsequent prompts return { continue: true } immediately.
 *
 * Never blocks user prompts (always continue: true).
 */
export function injectContext(input: UserPromptSubmitInput): HookOutput {
  const { session_id } = input;

  // Security: validate payload cwd before any fs / execSync usage downstream.
  const cwd = validateCwd(input.cwd);
  if (cwd === null) {
    return { continue: true };
  }

  // Gate 1: skip if not an FCA-AI project
  if (!isFcaProject(cwd)) {
    return { continue: true };
  }

  // Gate 2: skip only when both session marker AND prompt-context exist
  if (!isFirstInSession(session_id, cwd) && hasPromptContext(session_id, cwd)) {
    return { continue: true };
  }

  const additionalContext = buildMinimalContext(cwd);

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
