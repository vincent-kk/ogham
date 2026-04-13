import type { AdfNode } from '../types/adf-node.js';

export function convertTable(
  rows: AdfNode[],
  renderBlock: (node: AdfNode, indent?: string) => string,
): string {
  if (rows.length === 0) return '';

  const renderedRows = rows.map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map((child) => renderBlock(child))
        .join(' '),
    ),
  );

  if (renderedRows.length === 0) return '';

  const columnCount = Math.max(...renderedRows.map((row) => row.length));
  const lines: string[] = [];

  lines.push(`| ${renderedRows[0].map((cell) => cell || ' ').join(' | ')} |`);
  lines.push(`| ${Array(columnCount).fill('---').join(' | ')} |`);

  for (let index = 1; index < renderedRows.length; index++) {
    const row = [...renderedRows[index]];
    while (row.length < columnCount) row.push('');
    lines.push(`| ${row.join(' | ')} |`);
  }

  return lines.join('\n');
}
