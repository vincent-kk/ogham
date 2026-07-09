/**
 * @file parseDocumentFromFile.ts
 * @description 파일을 읽어 ParsedDocument를 반환한다.
 * (파일 I/O를 포함하는 편의 함수 — 테스트에서는 parseDocument를 직접 사용 권장)
 */
import { readFile } from 'node:fs/promises';

import type { ParsedDocument } from '../types/types.js';

import { parseDocument } from './parseDocument.js';

/**
 * @param absolutePath - 파일 절대 경로
 * @param relativePath - vault 루트 기준 상대 경로
 * @param mtime - 파일 수정 시간
 * @returns 파싱된 문서
 */
export async function parseDocumentFromFile(
  absolutePath: string,
  relativePath: string,
  mtime: number,
): Promise<ParsedDocument> {
  const content = await readFile(absolutePath, 'utf-8');
  return parseDocument(relativePath, content, mtime);
}
