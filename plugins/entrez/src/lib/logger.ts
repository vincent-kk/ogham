/**
 * Minimal stderr logger. MCP servers speak JSON-RPC over stdout, so logs MUST
 * go to stderr only. Never logs credentials.
 */
function emit(level: string, message: string): void {
  process.stderr.write(`[entrez] [${level}] ${message}\n`);
}

export const logger = {
  info: (message: string): void => emit("info", message),
  warn: (message: string): void => emit("warn", message),
  error: (message: string): void => emit("error", message),
};
