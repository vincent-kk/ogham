import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { DebtItem } from '../../../../types/debt.js';
import { getDebtDir } from '../utils/get-debt-dir.js';
import { parseFrontmatter } from '../utils/parse-frontmatter.js';

export async function handleList(
  projectRoot: string,
  fractalPath?: string,
): Promise<{ debts: DebtItem[]; totalWeight: number }> {
  const debtDir = getDebtDir(projectRoot);

  let files: string[];
  try {
    files = await readdir(debtDir);
  } catch {
    return { debts: [], totalWeight: 0 };
  }

  const mdFiles = files.filter((f) => f.endsWith('.md'));
  if (mdFiles.length === 0) {
    return { debts: [], totalWeight: 0 };
  }

  const debts: DebtItem[] = [];

  for (const file of mdFiles) {
    const filePath = join(debtDir, file);
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);

    if (Object.keys(fm).length === 0) continue;

    const debt: DebtItem = {
      id: String(fm['id'] ?? ''),
      fractal_path: String(fm['fractal_path'] ?? ''),
      file_path: String(fm['file_path'] ?? ''),
      created_at: String(fm['created_at'] ?? ''),
      review_branch: String(fm['review_branch'] ?? ''),
      original_fix_id: String(fm['original_fix_id'] ?? ''),
      severity: (fm['severity'] as DebtItem['severity']) ?? 'LOW',
      weight: Number(fm['weight'] ?? 1),
      touch_count: Number(fm['touch_count'] ?? 0),
      last_review_commit: fm['last_review_commit'] as string | null,
      rule_violated: String(fm['rule_violated'] ?? ''),
      metric_value: String(fm['metric_value'] ?? ''),
      title: '',
      original_request: '',
      developer_justification: '',
      refined_adr: '',
    };

    const titleMatch = /^# 기술 부채: (.+)$/m.exec(content);
    if (titleMatch) debt.title = titleMatch[1].trim();

    const orMatch = /## 원래 수정 요청\n([\s\S]*?)(?=\n##|$)/.exec(content);
    if (orMatch) debt.original_request = orMatch[1].trim();

    const djMatch = /## 개발자 소명\n([\s\S]*?)(?=\n##|$)/.exec(content);
    if (djMatch) debt.developer_justification = djMatch[1].trim();

    const adrMatch = /## 정제된 ADR\n([\s\S]*?)(?=\n##|$)/.exec(content);
    if (adrMatch) debt.refined_adr = adrMatch[1].trim();

    debts.push(debt);
  }

  const filtered = fractalPath
    ? debts.filter((d) => d.fractal_path === fractalPath)
    : debts;

  const totalWeight = filtered.reduce((sum, d) => sum + d.weight, 0);

  return { debts: filtered, totalWeight };
}
