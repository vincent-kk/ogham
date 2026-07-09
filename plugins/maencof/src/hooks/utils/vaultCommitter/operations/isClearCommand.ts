/**
 * @file isClearCommand.ts
 * @description Backward-compatible `/clear` matcher retained for existing call sites.
 */

/**
 * Backward-compatible helper retained for existing call sites (e.g., dedicated
 * "/clear" unit tests). Use `shouldCommitOnPrompt` for the full configurable
 * check.
 */
export function isClearCommand(prompt: string): boolean {
  return /^\s*\/clear\s*$/i.test(prompt);
}
