import { createHash } from 'node:crypto';

export function cwdHash(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex').slice(0, 16);
}
