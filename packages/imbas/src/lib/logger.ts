/**
 * Lightweight debug logger for imbas.
 *
 * All output is gated by IMBAS_DEBUG=1. When enabled, writes to:
 *   1. stderr (console.error) — visible in direct execution
 *   2. debug.log file (appendFileSync) — visible via `tail -f` in hook context
 *
 * Usage:
 *   import { createLogger, setLogDir } from '../lib/logger.js';
 *   const log = createLogger('setup');
 *   setLogDir('/path/to/cache/dir');  // enables file logging (once per process)
 *   log.debug('message', error);
 */
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

let _logDir: string | undefined;

function isDebug(): boolean {
  return process.env['IMBAS_DEBUG'] === '1';
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) return arg.stack ?? arg.message;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function writeToFile(
  level: string,
  tag: string,
  msg: string,
  args: unknown[],
): void {
  if (!_logDir) return;
  try {
    if (!existsSync(_logDir)) mkdirSync(_logDir, { recursive: true });
    const ts = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(formatArg).join(' ') : '';
    appendFileSync(
      join(_logDir, 'debug.log'),
      `${ts} ${level} ${tag} ${msg}${argsStr}\n`,
    );
  } catch {
    // never throw from logging
  }
}

/**
 * Set the directory for file-based debug logging.
 * Call once per process with the plugin cache directory.
 * File logging is only active when IMBAS_DEBUG=1.
 */
export function setLogDir(dir: string): void {
  _logDir = dir;
}

/** Get current log directory (for testing). */
export function getLogDir(): string | undefined {
  return _logDir;
}

/** Reset logger state (for testing). */
export function resetLogger(): void {
  _logDir = undefined;
}

export interface Logger {
  debug(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

/**
 * Create a component-tagged logger.
 * Both debug() and error() are gated by IMBAS_DEBUG=1 to preserve
 * the existing silent degradation behavior.
 */
export function createLogger(component: string): Logger {
  const tag = `[imbas:${component}]`;

  return {
    debug(msg: string, ...args: unknown[]): void {
      if (!isDebug()) return;
      try {
        console.error(tag, msg, ...args);
      } catch {
        // never throw
      }
      writeToFile('DEBUG', tag, msg, args);
    },
    error(msg: string, ...args: unknown[]): void {
      if (!isDebug()) return;
      try {
        console.error(tag, msg, ...args);
      } catch {
        // never throw
      }
      writeToFile('ERROR', tag, msg, args);
    },
  };
}
