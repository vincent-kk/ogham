import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { assertUnder } from '../../utils/fs-guard.js';
import { getDebtDir } from '../utils/get-debt-dir.js';

export async function handleResolve(
  projectRoot: string,
  debtId: string,
): Promise<{ deleted: boolean }> {
  const debtDir = getDebtDir(projectRoot);
  const filePath = join(debtDir, `${debtId}.md`);
  assertUnder(debtDir, filePath);
  try {
    await unlink(filePath);
    return { deleted: true };
  } catch {
    return { deleted: false };
  }
}
