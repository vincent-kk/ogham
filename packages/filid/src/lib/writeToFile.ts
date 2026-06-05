import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { formatArg } from './formatArg.js';
import { logDirState } from './logDirState.js';

export function writeToFile(
  level: string,
  tag: string,
  msg: string,
  args: unknown[],
): void {
  const dir = logDirState.value;
  if (!dir) return;
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(formatArg).join(' ') : '';
    appendFileSync(
      join(dir, 'debug.log'),
      `${ts} ${level} ${tag} ${msg}${argsStr}\n`,
    );
  } catch {
    // never throw from logging
  }
}
