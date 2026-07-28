// A provider streams for as long as its tier cap allows — up to six hours on apex —
// and every event lands in one JS string. The answer is always in the last events, so
// bound what a single call holds: an unbounded run reaches the V8 string limit inside
// a stdout listener, where the throw escapes every try/catch and takes the MCP server
// down with every session it is serving.
export const MAX_CLI_OUTPUT_CHARS = 8 * 1024 * 1024;
