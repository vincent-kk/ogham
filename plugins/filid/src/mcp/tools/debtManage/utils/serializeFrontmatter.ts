import type { DebtItem } from '../../../../types/debt.js';

export function serializeFrontmatter(item: DebtItem): string {
  const fields: Array<keyof DebtItem> = [
    'id',
    'fractal_path',
    'file_path',
    'created_at',
    'review_branch',
    'original_fix_id',
    'severity',
    'weight',
    'touch_count',
    'last_review_commit',
    'rule_violated',
    'metric_value',
  ];
  const lines = fields.map((key) => {
    const value = item[key];
    if (value === null || value === undefined) {
      return `${key}: null`;
    }
    if (
      typeof value === 'string' &&
      (value.includes(':') || value.includes('\n') || value.includes("'"))
    ) {
      return `${key}: "${value.replace(/"/g, '\\"')}"`;
    }
    return `${key}: ${value}`;
  });
  return `---\n${lines.join('\n')}\n---`;
}
