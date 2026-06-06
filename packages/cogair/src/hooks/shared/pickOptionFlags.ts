import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type {
  AntigravityFlags,
  CodexFlags,
  CodexSandboxMode,
  GeminiFlags,
  GeminiSandboxBackend,
  OptionFlags,
} from './configTypes.js';
import { isObj } from './isObj.js';

const GEMINI_BACKENDS: ReadonlySet<GeminiSandboxBackend> = new Set([
  'auto',
  'docker',
  'podman',
  'sandbox-exec',
]);

const CODEX_SANDBOX_MODES: ReadonlySet<CodexSandboxMode> = new Set([
  'read-only',
  'workspace-write',
  'danger-full-access',
  'off',
]);

function pickGemini(raw: unknown): GeminiFlags {
  const defaults = DEFAULT_CONFIG.option_flags.gemini;
  if (!isObj(raw)) return defaults;
  const backend = raw.sandbox_backend;
  return {
    yolo: typeof raw.yolo === 'boolean' ? raw.yolo : defaults.yolo,
    sandbox: typeof raw.sandbox === 'boolean' ? raw.sandbox : defaults.sandbox,
    sandbox_backend:
      typeof backend === 'string' &&
      GEMINI_BACKENDS.has(backend as GeminiSandboxBackend)
        ? (backend as GeminiSandboxBackend)
        : defaults.sandbox_backend,
  };
}

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

export function pickOptionFlags(raw: unknown): OptionFlags {
  if (!isObj(raw)) return DEFAULT_CONFIG.option_flags;
  return {
    gemini: pickGemini(raw.gemini),
    codex: pickCodex(raw.codex),
    antigravity: pickAntigravity(raw.antigravity),
  };
}
