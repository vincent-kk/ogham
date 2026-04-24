import { join } from 'node:path';

export function getDebtDir(projectRoot: string): string {
  return join(projectRoot, '.filid', 'debt');
}
