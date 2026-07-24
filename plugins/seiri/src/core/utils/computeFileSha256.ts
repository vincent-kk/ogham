import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * SHA-256 hex digest of a file's raw bytes.
 *
 * Returns `null` when the file is missing or unreadable so callers can
 * treat that as "no deployed hash" instead of guarding every call site.
 * Hashing raw bytes is what makes drift detection exact — which is also
 * why `.gitattributes` pins the rule templates to LF.
 */
export function computeFileSha256(path: string): string | null {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch {
    return null;
  }
}
