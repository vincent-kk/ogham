import type { SgNode } from '@ast-grep/napi';

import {
  EXT_TO_LANG,
  getSgLoadError,
  getSgModule,
  toLangEnum,
} from '../ast-grep-shared/ast-grep-shared.js';

/**
 * Parse TypeScript/JavaScript source into an AST root node.
 * Throws if @ast-grep/napi is not available.
 */
export async function parseSource(
  source: string,
  filePath = 'anonymous.ts',
): Promise<SgNode> {
  const sg = await getSgModule();
  if (!sg) {
    throw new Error(
      `@ast-grep/napi is not available. Install it with: npm install -g @ast-grep/napi` +
        (getSgLoadError() ? ` (${getSgLoadError()})` : ''),
    );
  }

  // Detect language from file extension, default to typescript
  const ext = filePath.includes('.') ? '.' + filePath.split('.').pop() : '.ts';
  const langStr = EXT_TO_LANG[ext] ?? 'typescript';
  const lang = toLangEnum(sg, langStr);

  return sg.parse(lang, source).root();
}
