export type MarkdownBlock =
  | { type: 'codeBlock'; language: string; code: string }
  | { type: 'rule' }
  | { type: 'heading'; level: number; text: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'bulletList'; items: string[] }
  | { type: 'orderedList'; items: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'paragraph'; text: string };

function isHorizontalRule(line: string): boolean {
  const stripped = line.trim();
  return /^[-*_]{3,}$/.test(stripped) && !line.startsWith('- ') && !line.startsWith('* ');
}

function parseTableRows(lines: string[], startIndex: number): {
  block: Extract<MarkdownBlock, { type: 'table' }>;
  nextIndex: number;
} {
  const tableLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && lines[index].startsWith('|')) {
    tableLines.push(lines[index]);
    index++;
  }

  const rows = tableLines
    .map((rowLine) => rowLine.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)));

  return {
    block: { type: 'table', rows },
    nextIndex: index,
  };
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  if (!markdown || !markdown.trim()) return [];

  const lines = markdown.split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      index++;

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }

      if (index < lines.length) index++;

      blocks.push({
        type: 'codeBlock',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    if (isHorizontalRule(line)) {
      blocks.push({ type: 'rule' });
      index++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      index++;
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        quoteLines.push(lines[index].slice(2));
        index++;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ''));
        index++;
      }
      blocks.push({ type: 'bulletList', items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ''));
        index++;
      }
      blocks.push({ type: 'orderedList', items });
      continue;
    }

    if (line.startsWith('|') && line.indexOf('|', 1) > 0) {
      const { block, nextIndex } = parseTableRows(lines, index);
      if (block.rows.length > 0) blocks.push(block);
      index = nextIndex;
      continue;
    }

    if (!line.trim()) {
      index++;
      continue;
    }

    blocks.push({ type: 'paragraph', text: line });
    index++;
  }

  return blocks;
}
