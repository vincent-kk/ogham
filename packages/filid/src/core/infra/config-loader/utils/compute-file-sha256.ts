import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Compute the SHA-256 hex digest of a file's raw bytes.
 * Returns `null` when the file is missing or unreadable so callers can
 * treat it as "no deployed hash" without defensive try/catch.
 */
export function computeFileSha256(path: string): string | null {
  try {
    const bytes = readFileSync(path);
    return createHash('sha256').update(bytes).digest('hex');
  } catch {
    return null;
  }
}
