import type { DocCompressInput } from '../doc-compress.js';

export function inferMode(input: DocCompressInput): 'reversible' | 'lossy' {
  if (input.content !== undefined && input.filePath) return 'reversible';
  if (input.toolCallEntries && input.toolCallEntries.length > 0) return 'lossy';
  return 'reversible';
}
