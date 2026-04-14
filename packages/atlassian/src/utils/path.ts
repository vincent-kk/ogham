import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

/** Validate a save path: reject traversal and restrict to cwd or tmpdir. */
export function validateSavePath(saveTo: string): string {
  if (saveTo.includes('..')) {
    throw new Error('Invalid save path: path traversal detected');
  }

  const normalized = resolve(saveTo);
  const cwd = process.cwd();
  const tmp = tmpdir();
  if (!normalized.startsWith(cwd) && !normalized.startsWith(tmp)) {
    throw new Error('Invalid save path: must be under working directory or temp directory');
  }

  return normalized;
}
