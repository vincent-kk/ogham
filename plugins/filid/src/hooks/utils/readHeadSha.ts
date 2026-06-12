import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findGitDir } from './findGitDir.js';

const SHA_RE = /^[0-9a-f]{40,64}$/;

/**
 * Resolve the current HEAD commit sha without spawning git: detached HEAD
 * content first, then the loose ref file, then the packed-refs fallback.
 * Returns null when the sha cannot be resolved.
 */
export function readHeadSha(cwd: string): string | null {
  const dirs = findGitDir(cwd);
  if (dirs === null) return null;
  try {
    const head = readFileSync(join(dirs.gitDir, 'HEAD'), 'utf-8').trim();
    const refMatch = /^ref:\s*(.+)$/.exec(head);
    if (refMatch === null) return SHA_RE.test(head) ? head : null;
    const ref = refMatch[1].trim();
    try {
      const loose = readFileSync(
        join(dirs.commonDir, ...ref.split('/')),
        'utf-8',
      ).trim();
      if (SHA_RE.test(loose)) return loose;
    } catch {
      /* loose ref absent — fall through to packed-refs */
    }
    const packed = readFileSync(join(dirs.commonDir, 'packed-refs'), 'utf-8');
    for (const line of packed.split('\n')) {
      if (line.startsWith('#') || line.startsWith('^')) continue;
      const space = line.indexOf(' ');
      if (space > 0 && line.slice(space + 1).trim() === ref)
        return line.slice(0, space);
    }
    return null;
  } catch {
    return null;
  }
}
