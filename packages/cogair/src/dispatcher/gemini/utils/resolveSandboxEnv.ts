import type { GeminiSandboxBackend } from '../../../types/index.js';

export interface SandboxEnvInput {
  sandbox?: boolean;
  sandboxBackend?: GeminiSandboxBackend;
}

/**
 * Resolve the GEMINI_SANDBOX env contribution for a gemini spawn.
 *
 * Permission flags are config-driven (the GeminiFlags channel decides alone),
 * so an explicit sandbox=false MUST override any inherited GEMINI_SANDBOX in
 * the parent environment: gemini-cli treats GEMINI_SANDBOX=<backend> as
 * enabling the sandbox even when the --sandbox flag is absent.
 *
 * - sandbox undefined: caller has no flag context (e.g. --list-sessions
 *   metadata calls) — contribute nothing.
 * - sandbox false: force GEMINI_SANDBOX=false to defeat inheritance.
 * - sandbox true + backend !== 'auto': pin the chosen backend.
 * - sandbox true + backend 'auto'/unset: defer to the --sandbox flag.
 */
export function resolveSandboxEnv(
  input: SandboxEnvInput,
): Record<string, string> {
  if (input.sandbox === undefined) {
    return {};
  }
  if (!input.sandbox) {
    return { GEMINI_SANDBOX: 'false' };
  }
  if (input.sandboxBackend && input.sandboxBackend !== 'auto') {
    return { GEMINI_SANDBOX: input.sandboxBackend };
  }
  return {};
}
