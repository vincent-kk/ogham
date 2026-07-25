import type { CodexMcpBlockSearch } from "./findCodexMcpBlock.js";

export function mergeCodexMcpBlock(options: {
  readonly source: string;
  readonly block: CodexMcpBlockSearch;
  readonly replacement: string | null;
}): string {
  if (!options.block.ok) return options.source;
  const range = options.block.range;
  if (range !== null)
    return (
      options.source.slice(0, range.start) +
      (options.replacement ?? "") +
      options.source.slice(range.end)
    );
  if (options.replacement === null) return options.source;
  const separator =
    options.source.length === 0
      ? ""
      : options.source.endsWith("\n")
        ? "\n"
        : "\n\n";
  return `${options.source}${separator}${options.replacement}`;
}
