import { createHash } from 'node:crypto';

export function normalizeId(fractalPath: string, content: string): string {
  const normalized = fractalPath.replace(/\//g, '-');
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 6);
  return `${normalized}-${hash}`;
}
