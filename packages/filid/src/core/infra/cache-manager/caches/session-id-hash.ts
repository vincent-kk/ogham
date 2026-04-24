import { createHash } from 'node:crypto';

export function sessionIdHash(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
}
