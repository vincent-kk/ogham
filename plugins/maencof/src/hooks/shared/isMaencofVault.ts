import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { MAENCOF_DIR, MAENCOF_META_DIR } from '../../constants/directories.js';

function hasVaultMarker(dir: string): boolean {
  return (
    existsSync(join(dir, MAENCOF_DIR)) ||
    existsSync(join(dir, MAENCOF_META_DIR))
  );
}

/**
 * Check whether `cwd` is *itself* a maencof vault root (the .maencof/ or
 * .maencof-meta/ marker lives directly in it). Callers that then treat `cwd`
 * as the vault root depend on this exact-match semantics.
 */
export function isMaencofVault(cwd: string): boolean {
  return hasVaultMarker(cwd);
}

/**
 * Check whether `startDir` is inside a vault — the marker lives at `startDir`
 * or any ancestor, bounded by a `.git` root or the filesystem root. Use this,
 * not `isMaencofVault`, when the directory may be a subdirectory of the vault
 * (e.g. a hook that only received the edited file's own folder, as on agy where
 * no workspace path is supplied). Only answers "in a vault?", never "where".
 */
export function isInsideMaencofVault(startDir: string): boolean {
  let cursor = startDir;
  while (cursor) {
    if (hasVaultMarker(cursor)) return true;
    if (existsSync(join(cursor, '.git'))) return false;
    const parent = dirname(cursor);
    if (parent === cursor) return false;
    cursor = parent;
  }
  return false;
}
