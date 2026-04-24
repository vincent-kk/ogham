import { readFile } from 'node:fs/promises';

import {
  RE_IMPORT,
  RE_DYNAMIC_IMPORT,
  RE_REQUIRE,
} from '../../../constants/entry-candidates.js';

/**
 * TypeScript 파일에서 import 경로를 추출한다.
 * 정규식 기반 (AST 파싱 없음).
 *
 * @param filePath - 분석할 파일의 절대 경로
 * @returns import 경로 목록 (상대 경로 그대로)
 */
export async function extractImports(filePath: string): Promise<string[]> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return [];
  }

  const paths = new Set<string>();

  for (const pattern of [RE_IMPORT, RE_DYNAMIC_IMPORT, RE_REQUIRE]) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = content.matchAll(regex);
    for (const match of matches) {
      const importPath = match[1];
      if (importPath) paths.add(importPath);
    }
  }

  return [...paths];
}
