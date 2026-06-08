// JS challenge runtime: reuse the MCP server's own Node (ADR-3, no extra install).
export function jsRuntimeArg(nodePath: string): string[] {
  return ['--js-runtimes', `node:${nodePath}`];
}
