/** File-level opt-in syntax; only the generated copy removes this marker. */
export const MCP_TOOL_MARKER = /<!-- ogham-mcp-tools:([a-z][a-z0-9-]*) -->/g;

/** Candidate tool addresses; dot names are captured for explicit rejection. */
export const MCP_TOOL_TOKEN = /\bmcp__[A-Za-z0-9_.-]+/g;

/** Source names supported by the explicit callable-reference contract. */
export const MCP_SOURCE_NAME = /^[A-Za-z0-9_-]+$/;
