/**
 * agy tool name → Claude hook vocabulary, for PreToolUse gating.
 *
 * agy hands a PreToolUse hook `toolCall: {name, args}` with Cascade-style tools and
 * PascalCase args; the bundled ogham guards match on Claude's `Write`/`Edit`/`Read`
 * names and read `tool_input.file_path`. This table bridges the two. Measured against
 * agy 1.1.2 (2026-07-15): `view_file{AbsolutePath}`, `write_to_file{TargetFile,
 * CodeContent}`, `run_command{CommandLine}`, `grep_search`; `replace_file_content`
 * carries the same `TargetFile` as its edit target.
 *
 * An unknown tool passes its name through so guards simply don't match it — the safe
 * default, since agy honours a `deny` and a wrong mapping could block a real tool.
 */
interface AgyToolSpec {
  claude: string;
  /** agy arg holding the absolute file path, mapped to Claude `file_path`. */
  pathArg?: string;
  /** agy arg holding the new file body, mapped to Claude `content`. */
  contentArg?: string;
}

const AGY_TOOLS: Record<string, AgyToolSpec> = {
  write_to_file: {
    claude: "Write",
    pathArg: "TargetFile",
    contentArg: "CodeContent",
  },
  replace_file_content: { claude: "Edit", pathArg: "TargetFile" },
  view_file: { claude: "Read", pathArg: "AbsolutePath" },
  grep_search: { claude: "Grep" },
  run_command: { claude: "Bash" },
};

export function agyToolToClaude(
  name: string,
  args: Record<string, unknown> | undefined,
): { tool_name: string; tool_input: Record<string, unknown> } {
  const spec = AGY_TOOLS[name];
  if (!spec) return { tool_name: name, tool_input: args ?? {} };

  const tool_input: Record<string, unknown> = { ...args };
  const pathValue = spec.pathArg ? args?.[spec.pathArg] : undefined;
  if (typeof pathValue === "string") tool_input["file_path"] = pathValue;
  const contentValue = spec.contentArg ? args?.[spec.contentArg] : undefined;
  if (typeof contentValue === "string") tool_input["content"] = contentValue;

  return { tool_name: spec.claude, tool_input };
}
