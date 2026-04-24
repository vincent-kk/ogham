import { readFile } from 'node:fs/promises';

import type {
  ModuleExportInfo,
  PublicApi,
} from '../../../types/fractal.js';

import { extractModuleExports } from '../index-analyzer/index-analyzer.js';

/**
 * 진입점 파일을 분석하여 외부 공개 API를 추출한다.
 *
 * @param entryPoint - 진입점 파일의 절대 경로
 * @returns 공개 API (exports, types, functions, classes)
 */
export async function extractPublicApi(entryPoint: string): Promise<PublicApi> {
  let content: string;
  try {
    content = await readFile(entryPoint, 'utf-8');
  } catch {
    return { exports: [], types: [], functions: [], classes: [] };
  }

  const exports: ModuleExportInfo[] = extractModuleExports(content);

  const types: string[] = [];
  const functions: string[] = [];
  const classes: string[] = [];

  // named export를 분류 (type, function, class)
  const RE_FUNC_EXPORT = /^export\s+(?:async\s+)?function\s+(\w+)/gm;
  const RE_CLASS_EXPORT = /^export\s+(?:abstract\s+)?class\s+(\w+)/gm;
  const RE_TYPE_ALIAS = /^export\s+type\s+(\w+)\s*[=<{]/gm;
  const RE_INTERFACE = /^export\s+interface\s+(\w+)/gm;

  for (const match of content.matchAll(RE_FUNC_EXPORT)) {
    functions.push(match[1]);
  }
  for (const match of content.matchAll(RE_CLASS_EXPORT)) {
    classes.push(match[1]);
  }
  for (const match of content.matchAll(RE_TYPE_ALIAS)) {
    types.push(match[1]);
  }
  for (const match of content.matchAll(RE_INTERFACE)) {
    types.push(match[1]);
  }

  return {
    exports,
    types: [...new Set(types)],
    functions: [...new Set(functions)],
    classes: [...new Set(classes)],
  };
}
