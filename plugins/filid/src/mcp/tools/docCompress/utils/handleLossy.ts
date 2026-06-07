import { summarizeLossy } from '../../../../compress/lossySummarizer/lossySummarizer.js';
import type { DocCompressInput, DocCompressOutput } from '../docCompress.js';

export function handleLossy(input: DocCompressInput): DocCompressOutput {
  const entries = input.toolCallEntries ?? [];
  const result = summarizeLossy(entries);

  return {
    summary: result.summary,
    meta: result.meta,
    cap_applies: { intent: true, detail: false },
  };
}
