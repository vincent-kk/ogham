import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type {
  AntigravityFlags,
  ClaudeFlags,
  ClaudePermissionMode,
  CodexFlags,
  CodexSandboxMode,
  OptionFlags,
} from './configTypes.js';
import { isObj } from './isObj.js';

const CODEX_SANDBOX_MODES: ReadonlySet<CodexSandboxMode> = new Set([
  'read-only',
  'workspace-write',
  'danger-full-access',
  'off',
]);

const CLAUDE_PERMISSION_MODES: ReadonlySet<ClaudePermissionMode> = new Set([
  'default',
  'acceptEdits',
  'auto',
  'dontAsk',
  'plan',
  'bypassPermissions',
]);

function pickCodex(raw: unknown): CodexFlags {
  const defaults = DEFAULT_CONFIG.option_flags.codex;
  if (!isObj(raw)) return defaults;
  const sandbox = raw.sandbox;
  return {
    yolo: typeof raw.yolo === 'boolean' ? raw.yolo : defaults.yolo,
    sandbox:
      typeof sandbox === 'string' &&
      CODEX_SANDBOX_MODES.has(sandbox as CodexSandboxMode)
        ? (sandbox as CodexSandboxMode)
        : defaults.sandbox,
  };
}

function pickAntigravity(raw: unknown): AntigravityFlags {
  const defaults = DEFAULT_CONFIG.option_flags.antigravity;
  if (!isObj(raw)) return defaults;
  return {
    sandbox: typeof raw.sandbox === 'boolean' ? raw.sandbox : defaults.sandbox,
    skip_permissions:
      typeof raw.skip_permissions === 'boolean'
        ? raw.skip_permissions
        : defaults.skip_permissions,
  };
}

function pickClaude(raw: unknown): ClaudeFlags {
  const defaults = DEFAULT_CONFIG.option_flags.claude;
  if (!isObj(raw)) return defaults;
  const mode = raw.permission_mode;
  const result: ClaudeFlags = {
    permission_mode:
      typeof mode === 'string' &&
      CLAUDE_PERMISSION_MODES.has(mode as ClaudePermissionMode)
        ? (mode as ClaudePermissionMode)
        : defaults.permission_mode,
  };
  if (typeof raw.fallback_model === 'string')
    result.fallback_model = raw.fallback_model;
  return result;
}

export function pickOptionFlags(raw: unknown): OptionFlags {
  if (!isObj(raw)) return DEFAULT_CONFIG.option_flags;
  return {
    codex: pickCodex(raw.codex),
    antigravity: pickAntigravity(raw.antigravity),
    claude: pickClaude(raw.claude),
  };
}
