import { destination, pino, type Logger } from 'pino';

export type { Logger };

/**
 * Creates the structured logger. CRITICAL: writes to fd 2 (stderr) only — fd 1
 * is the JSON-RPC channel for stdio MCP and must never be polluted (PLAN §11.1).
 */
export function createLogger(level: string): Logger {
  return pino(
    {
      level,
      base: undefined,
    },
    destination({ fd: 2, sync: true }),
  );
}
