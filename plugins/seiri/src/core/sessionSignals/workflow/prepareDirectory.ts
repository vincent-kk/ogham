import { mkdirSync, readFileSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { SESSIONS_DIR } from '../../../constants/files.js';
import { ensureSeiriDir } from '../../utils/ensureSeiriDir.js';

/** Refuse automatic metadata when a user-owned ignore file does not exclude it. */
export function prepareDirectory(root: string): string | undefined {
  const dir = ensureSeiriDir(root);
  const lines = readFileSync(portableJoin(dir, '.gitignore'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  if (
    !lines.some((line) =>
      ['sessions/', '/sessions/', 'sessions', '/sessions', '*'].includes(line),
    ) ||
    lines.some((line) => line.startsWith('!'))
  )
    return undefined;
  const sessions = portableJoin(dir, SESSIONS_DIR);
  mkdirSync(sessions, { recursive: true });
  return sessions;
}
