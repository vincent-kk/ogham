/**
 * @file ast-search.ts
 * @description AST pattern search via @ast-grep/napi
 */

import { readFileSync } from 'node:fs';

import {
  getSgModule,
  getSgLoadError,
  collectFiles,
  toLangEnum,
} from '../../../ast/index.js';
import { AST_SEARCH_MAX_RESULTS } from '../../../constants/defaults.js';

export interface AstSearchInput {
  pattern: string;
  language: string;
  path?: string;
  context?: number;
  max_results?: number;
}

export async function handleAstSearch(input: AstSearchInput) {
  const sg = await getSgModule();
  if (!sg) {
    return {
      error: '@ast-grep/napi is not available. Install it with: npm install -g @ast-grep/napi',
      sgLoadError: getSgLoadError(),
    };
  }

  try {
    const searchDir = input.path ?? process.cwd();
    const maxResults = input.max_results ?? AST_SEARCH_MAX_RESULTS;
    const files = collectFiles(searchDir, input.language);

    const lang = toLangEnum(sg, input.language);
    const matches: Array<{
      file: string;
      text: string;
      start: { line: number; column: number };
      end: { line: number; column: number };
    }> = [];

    for (const file of files) {
      if (matches.length >= maxResults) break;
      try {
        const source = readFileSync(file, 'utf-8');
        const root = sg.parse(lang, source).root();
        const found = root.findAll({ rule: { pattern: input.pattern } });
        for (const node of found) {
          if (matches.length >= maxResults) break;
          const range = node.range();
          matches.push({
            file,
            text: node.text(),
            start: range.start,
            end: range.end,
          });
        }
      } catch {
        // skip unreadable files
      }
    }

    return { matches, total: matches.length, files_searched: files.length };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      sgLoadError: getSgLoadError(),
    };
  }
}
