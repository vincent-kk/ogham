import { createHash } from 'node:crypto';

/**
 * SHA-256 hex digest of a string.
 *
 * The file-based sibling cannot serve a rule document that lives as a section inside a
 * larger instruction file: there is no file whose bytes are just that document.
 */
export function computeTextSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
