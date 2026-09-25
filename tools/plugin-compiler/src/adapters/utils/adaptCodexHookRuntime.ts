/**
 * Select a prebuilt companion for canonical plugin-root bridge tokens only.
 * Matches a flat `bridge/<name>.mjs` token or one with a single existing
 * host segment (e.g. `bridge/claude/<name>.mjs`) so a per-host build layout
 * still resolves to the requested runtime directory; two or more segments
 * are left untouched as not a canonical bridge token.
 * @param command Canonical command text, including any wrapper and arguments.
 * @param directory Validated companion directory, or undefined without opt-in.
 * @returns Command with only the owned bridge prefix changed.
 */
export function adaptCodexHookRuntime(
  command: string | undefined,
  directory: string | undefined,
): string | undefined {
  if (directory === undefined) return command;
  return command?.replace(
    /\$\{CLAUDE_PLUGIN_ROOT\}\/bridge\/(?:[A-Za-z0-9][A-Za-z0-9_-]*\/)?([A-Za-z0-9][A-Za-z0-9_-]*\.mjs)(?=["'\s]|$)/g,
    (_token, basename: string) =>
      `\${CLAUDE_PLUGIN_ROOT}/${directory}/${basename}`,
  );
}
