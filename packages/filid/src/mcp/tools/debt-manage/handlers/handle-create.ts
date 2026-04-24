import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { DebtItem, DebtItemCreate } from '../../../../types/debt.js';
import { DEBT_BASE_WEIGHT } from '../../../../constants/debt-defaults.js';
import { buildMarkdownBody } from '../utils/build-markdown-body.js';
import { getDebtDir } from '../utils/get-debt-dir.js';
import { normalizeId } from '../utils/normalize-id.js';
import { serializeFrontmatter } from '../utils/serialize-frontmatter.js';

export async function handleCreate(
  projectRoot: string,
  debtItem: DebtItemCreate,
): Promise<{ filePath: string; id: string }> {
  const content = JSON.stringify(debtItem);
  const id = normalizeId(debtItem.fractal_path, content);

  const item: DebtItem = {
    ...debtItem,
    id,
    weight: DEBT_BASE_WEIGHT,
    touch_count: 0,
    last_review_commit: null,
  };

  const debtDir = getDebtDir(projectRoot);
  await mkdir(debtDir, { recursive: true });

  const filePath = join(debtDir, `${id}.md`);
  const fileContent = `${serializeFrontmatter(item)}\n\n${buildMarkdownBody(item)}\n`;
  await writeFile(filePath, fileContent, 'utf-8');

  return { filePath, id };
}
