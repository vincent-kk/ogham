import type { HtmlElement, HtmlNode } from './html-node.js';

function collectRows(
  children: HtmlNode[],
  rows: string[][],
  renderNode: (node: HtmlNode) => string,
): void {
  for (const child of children) {
    if (typeof child === 'string') continue;

    if (child.tag === 'tr') {
      const cells = child.children
        .filter((node): node is HtmlElement => typeof node !== 'string' && (node.tag === 'td' || node.tag === 'th'))
        .map((cell) => renderNode(cell).trim());
      rows.push(cells);
      continue;
    }

    if (child.tag === 'thead' || child.tag === 'tbody') {
      collectRows(child.children, rows, renderNode);
    }
  }
}

export function renderStorageTable(
  tableNode: HtmlElement,
  renderNode: (node: HtmlNode) => string,
): string {
  const rows: string[][] = [];
  collectRows(tableNode.children, rows, renderNode);

  if (rows.length === 0) return '';

  const columnCount = Math.max(...rows.map((row) => row.length));
  const lines: string[] = [];

  lines.push(`| ${rows[0].join(' | ')} |`);
  lines.push(`| ${Array(columnCount).fill('---').join(' | ')} |`);

  for (let index = 1; index < rows.length; index++) {
    const row = [...rows[index]];
    while (row.length < columnCount) row.push('');
    lines.push(`| ${row.join(' | ')} |`);
  }

  return `${lines.join('\n')}\n\n`;
}
