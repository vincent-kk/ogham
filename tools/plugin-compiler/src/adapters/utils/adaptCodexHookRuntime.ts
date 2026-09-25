/** Generation failure for an explicit, invalid prebuilt hook directory. */
export class CodexHookRuntimeError extends Error {
  /** Construct a fixed diagnostic without reflecting configuration content. */
  constructor() {
    super(
      "Codex hook runtime must be a relative directory under bridge/ using alphanumeric, underscore or hyphen segments",
    );
    this.name = "CodexHookRuntimeError";
  }
}

/**
 * Select a prebuilt companion for canonical plugin-root bridge tokens only.
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
    /\$\{CLAUDE_PLUGIN_ROOT\}\/bridge\/([A-Za-z0-9][A-Za-z0-9_-]*\.mjs)(?=["'\s]|$)/g,
    (_token, basename: string) =>
      `\${CLAUDE_PLUGIN_ROOT}/${directory}/${basename}`,
  );
}
