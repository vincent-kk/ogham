import { summarizeLossy } from '../../../../compress/lossy-summarizer/lossy-summarizer.js';
import type { DocCompressInput, DocCompressOutput } from '../doc-compress.js';

export function handleLossy(input: DocCompressInput): DocCompressOutput {
  const entries = input.toolCallEntries ?? [];
  const result = summarizeLossy(entries);

  return {
    summary: result.summary,
    meta: result.meta,
  };
}
