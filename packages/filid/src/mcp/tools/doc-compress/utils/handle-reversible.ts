import { compactReversible } from '../../../../compress/reversible-compactor/reversible-compactor.js';
import type { DocCompressInput, DocCompressOutput } from '../doc-compress.js';

export function handleReversible(input: DocCompressInput): DocCompressOutput {
  if (!input.content || !input.filePath) {
    return { error: 'Reversible mode requires filePath and content' };
  }

  const result = compactReversible({
    filePath: input.filePath,
    content: input.content,
    metadata: {
      exports: input.exports ?? [],
      lineCount: input.content.split('\n').filter((l) => l.length > 0).length,
    },
  });

  return {
    compacted: result.compacted,
    meta: result.meta,
  };
}
