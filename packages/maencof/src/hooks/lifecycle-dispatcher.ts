/**
 * @file lifecycle-dispatcher.ts
 * @description Lifecycle dispatcher — reads .maencof-meta/lifecycle.json and executes matching actions
 * Dispatches echo/remind actions based on the hook event passed as CLI argument.
 * C1 constraint: Must complete within 3 seconds.
 */
import { existsSync, readFileSync } from 'node:fs';

import type {
  LifecycleAction,
  LifecycleConfig,
  LifecycleDispatchResult,
  LifecycleEvent,
} from '../types/lifecycle.js';

import { isMaencofVault, metaPath } from './shared.js';

/** Input received from Claude Code hook stdin */
export interface LifecycleDispatcherInput {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
}

const VALID_EVENTS = new Set<LifecycleEvent>([
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Stop',
  'SessionEnd',
]);

/**
 * Main dispatcher: reads lifecycle.json, filters matching actions, executes them.
 * @param event - The hook event name (passed as CLI argument)
 * @param input - The hook input from stdin
 */
export function runLifecycleDispatcher(
  event: string,
  input: LifecycleDispatcherInput,
): LifecycleDispatchResult {
  const cwd = input.cwd ?? process.cwd();

  // Only run in maencof vaults
  if (!isMaencofVault(cwd)) {
    return { continue: true };
  }

  // Validate event name
  if (!VALID_EVENTS.has(event as LifecycleEvent)) {
    return { continue: true };
  }

  const lifecycleEvent = event as LifecycleEvent;

  // Read lifecycle.json
  const config = loadLifecycleConfig(cwd);
  if (!config || config.actions.length === 0) {
    return { continue: true };
  }

  // Filter matching actions
  const matching = config.actions.filter((action) =>
    isActionMatch(action, lifecycleEvent, input.tool_name),
  );

  if (matching.length === 0) {
    return { continue: true };
  }

  // Execute actions and collect messages
  const messages: string[] = [];
  for (const action of matching) {
    const msg = executeAction(action);
    if (msg) {
      messages.push(msg);
    }
  }

  return {
    continue: true,
    message: messages.length > 0 ? messages.join('\n') : undefined,
  };
}

/**
 * Load and parse .maencof-meta/lifecycle.json
 */
function loadLifecycleConfig(cwd: string): LifecycleConfig | null {
  const configPath = metaPath(cwd, 'lifecycle.json');
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as LifecycleConfig;

    // Basic validation
    if (parsed.version !== 1 || !Array.isArray(parsed.actions)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if an action matches the current event and tool context.
 */
function isActionMatch(
  action: LifecycleAction,
  event: LifecycleEvent,
  toolName?: string,
): boolean {
  // Must be enabled and match event
  if (!action.enabled || action.event !== event) {
    return false;
  }

  // For PreToolUse/PostToolUse, check matcher pattern against tool_name
  if (
    (event === 'PreToolUse' || event === 'PostToolUse') &&
    action.matcher &&
    toolName
  ) {
    const matchers = action.matcher.split('|').map((m) => m.trim());
    return matchers.includes(toolName);
  }

  // For PreToolUse/PostToolUse without matcher, match all tools
  return true;
}

/**
 * Execute a single lifecycle action and return the output message (if any).
 */
function executeAction(action: LifecycleAction): string | null {
  switch (action.type) {
    case 'echo': {
      const message = (action.config as { message?: string }).message;
      return message ? `[maencof:lifecycle] ${message}` : null;
    }

    case 'remind': {
      const config = action.config as {
        message?: string;
        condition?: string;
      };
      // v1: condition is reserved for future use, always trigger
      return config.message ? `[maencof:lifecycle] ${config.message}` : null;
    }

    default:
      return null;
  }
}
