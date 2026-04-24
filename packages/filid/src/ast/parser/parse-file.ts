import { readFileSync } from 'node:fs';

import type { SgNode } from '@ast-grep/napi';

import { parseSource } from './parse-source.js';

/**
 * Parse a file from disk into an AST root node.
 */
export async function parseFile(filePath: string): Promise<SgNode> {
  const source = readFileSync(filePath, 'utf-8');
  return parseSource(source, filePath);
}
