/**
 * context-injector.ts — UserPromptSubmit hook for FCA-AI context injection.
 *
 * Injects a minimal FCA-AI pointer on the session's first prompt.
 *
 * Output contract (session first prompt only):
 *   1. Action-path pointer to the active rule doc, OR a warning when the
 *      rule doc is not yet deployed / the project is not initialised.
 *   2. `[filid:lang] <lang>` language tag.
 *   3. Optional `[filid] Disabled rules: <ids>` line when overrides disabled
 *      any built-in rule.
 *
 * Deployed rule docs under `.claude/rules/` are auto-injected by Claude Code
 * as project instructions at session start — the hook MUST NOT duplicate
 * their content, only point to their location so the LLM can re-read them.
 *
 * Policy: session hooks never write to `.claude/rules/`. Validation always
 * uses the plugin's internal built-in rules plus project config overrides.
 *
 * Cache functions are provided by src/core/cache-manager.ts.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
 * Build minimal FCA-AI context.
 *
 * Validation state is derived from the plugin's internal rules and the
 * project's `.filid/config.json`. The deployed `.claude/rules/fca.md` file
 * is only probed with a single `existsSync` call to decide between the
 * pointer line and the "rules not deployed" warning.
 */
export function buildMinimalContext(cwd: string): string {
  const lines: string[] = [];
  const config = loadConfig(cwd);

  if (!config) {
    lines.push(
      '[filid] ⚠ Not initialized. Run /filid:filid-setup to create .filid/config.json.',
    );
  } else if (existsSync(join(cwd, '.claude', 'rules', 'fca.md'))) {
    lines.push('[filid] FCA-AI active. Rules: .claude/rules/fca.md');
  } else {
    lines.push(
      '[filid] ⚠ Rules not deployed. Run /filid:filid-setup to deploy .claude/rules/fca.md.',
    );
  }

  try {
    const lang = resolveLanguage(config);
    lines.push(`[filid:lang] ${lang}`);

    if (config) {
      const overrides = config.rules ?? {};
      const allRules = loadBuiltinRules(overrides, config['additional-allowed']);
      const disabledRules = allRules.filter((r) => !r.enabled);
      if (disabledRules.length > 0) {
        lines.push(
          `[filid] Disabled rules: ${disabledRules.map((r) => r.id).join(', ')}`,
        );
      }
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
