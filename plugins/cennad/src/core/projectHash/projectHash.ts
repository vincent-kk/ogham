import { createHash } from 'node:crypto';

export function getProjectHash(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex').slice(0, 12);
}
