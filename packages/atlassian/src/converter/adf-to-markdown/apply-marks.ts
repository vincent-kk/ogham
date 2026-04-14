import type { AdfNode } from '../types/adf-node.js';

export function applyMarks(text: string, marks?: AdfNode['marks']): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `**${result}**`;
        break;
      case 'em':
        result = `*${result}*`;
        break;
      case 'code':
        result = `\`${result}\``;
        break;
      case 'strike':
        result = `~~${result}~~`;
        break;
      case 'link':
        result = `[${result}](${(mark.attrs?.href as string) ?? ''})`;
        break;
    }
  }

  return result;
}
