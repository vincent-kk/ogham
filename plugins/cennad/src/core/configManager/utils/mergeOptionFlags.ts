import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

const CLAUDE_PERMISSION_MODES = new Set([
  'acceptEdits',
  'auto',
  'dontAsk',
  'bypassPermissions',
]);

export function mergeOptionFlags(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.option_flags;
  if (!isPlainObject(raw)) return defaults;
  const rawClaude = isPlainObject(raw.claude) ? raw.claude : {};
  const permissionMode = rawClaude.permission_mode;
  return {
    codex: {
      ...defaults.codex,
      ...(isPlainObject(raw.codex) ? raw.codex : {}),
    },
    antigravity: {
      ...defaults.antigravity,
      ...(isPlainObject(raw.antigravity) ? raw.antigravity : {}),
    },
    claude: {
      ...defaults.claude,
      ...rawClaude,
      permission_mode:
        typeof permissionMode === 'string' &&
        CLAUDE_PERMISSION_MODES.has(permissionMode)
          ? permissionMode
          : defaults.claude.permission_mode,
    },
  };
}
