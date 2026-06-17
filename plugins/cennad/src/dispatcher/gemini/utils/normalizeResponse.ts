import { normalizeEol } from '@ogham/cross-platform';

export function normalizeResponse(stdout: string): string | null {
  const trimmed = normalizeEol(stdout).replace(/\n+$/, '');
  return trimmed.length > 0 ? trimmed : null;
}
