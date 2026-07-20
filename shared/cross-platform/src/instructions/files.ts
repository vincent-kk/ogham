/** The project instruction sheet Claude Code reads. */
export const CLAUDE_INSTRUCTIONS_FILE = "CLAUDE.md";

/** The project instruction sheet Codex reads — measured with `codex debug prompt-input`. */
export const CODEX_INSTRUCTIONS_FILE = "AGENTS.md";

/**
 * Every instruction file any supported host reads.
 *
 * Hook processes get no `OGHAM_HOST` marker — the adapters inject it into the MCP
 * declaration only — so hook-reachable code cannot ask which host it is on. It reads
 * all of these instead: a section is present if any of them carries it. That keeps the
 * read channel honest whichever channel the MCP server wrote to.
 */
export const INSTRUCTIONS_FILES = [
  CLAUDE_INSTRUCTIONS_FILE,
  CODEX_INSTRUCTIONS_FILE,
] as const;
