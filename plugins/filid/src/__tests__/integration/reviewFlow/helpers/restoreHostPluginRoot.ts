/**
 * Restore `CLAUDE_PLUGIN_ROOT` to the value it held before a fixture replaced it.
 * @param original Value read before the fixture changed it; undefined deletes the variable.
 * @returns Nothing; the process environment is updated.
 */
export function restoreHostPluginRoot(original: string | undefined): void {
  if (original === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = original;
}
