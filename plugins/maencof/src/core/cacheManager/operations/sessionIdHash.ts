/**
 * @file sessionIdHash.ts
 * @description Derive the 12-hex session-id hash used in session/prompt cache filenames.
 */
import { createHash } from 'node:crypto';

export function sessionIdHash(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 12);
}
