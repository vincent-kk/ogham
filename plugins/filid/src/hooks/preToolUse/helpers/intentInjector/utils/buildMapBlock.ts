import { compressPaths } from './compressPaths.js';
import { displayDir } from './displayDir.js';

/**
 * Render [filid:map] from the post-merge reads list (composite visit keys —
 * see visitKey.ts — stripped to boundary-relative dirs for display).
 * Emission gating (visit-set change) is decided by commitVisit; this only
 * renders.
 */
export function buildMapBlock(reads: string[], currentDir: string): string {
  return `[filid:map] ${compressPaths(reads.map(displayDir), currentDir)}`;
}
