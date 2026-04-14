import type { AdfNode } from '../types/adf-node.js';
import { applyMarks } from './apply-marks.js';

export function convertInline(node: AdfNode): string {
  switch (node.type) {
    case 'text':
      return applyMarks(node.text ?? '', node.marks);
    case 'hardBreak':
      return '\n';
    case 'mention': {
      const attrs = node.attrs ?? {};
      const text = (attrs.text as string) ?? (attrs.displayName as string);
      if (text) return text.startsWith('@') ? text : `@${text}`;
      return `@${(attrs.id as string) ?? 'unknown'}`;
    }
    case 'emoji': {
      const attrs = node.attrs ?? {};
      return (attrs.text as string) ?? (attrs.shortName as string) ?? '';
    }
    case 'date': {
      const timestamp = node.attrs?.timestamp;
      if (!timestamp) return '';

      try {
        return new Date(Number(timestamp)).toISOString().slice(0, 10);
      } catch {
        return String(timestamp);
      }
    }
    case 'status':
      return `[${(node.attrs?.text as string) ?? ''}]`;
    case 'inlineCard': {
      const attrs = node.attrs ?? {};
      const url = attrs.url as string | undefined;
      if (url) return url;

      const data = attrs.data as Record<string, unknown> | undefined;
      return (data?.url as string) ?? (data?.name as string) ?? '';
    }
    default:
      return '';
  }
}
