/**
 * @file coffaen-read.ts
 * @description coffaen_read 도구 핸들러 — 문서 읽기 + 관련 컨텍스트
 */
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/document-parser.js';
import type { CoffaenReadInput, CoffaenReadResult } from '../../types/mcp.js';

/**
 * coffaen_read 핸들러
 */
export async function handleCoffaenRead(
  vaultPath: string,
  input: CoffaenReadInput,
): Promise<CoffaenReadResult> {
  const absolutePath = join(vaultPath, input.path);

  let content: string;
  let mtime: number;

  try {
    const [raw, stats] = await Promise.all([
      readFile(absolutePath, 'utf-8'),
      stat(absolutePath),
    ]);
    content = raw;
    mtime = stats.mtimeMs;
  } catch {
    return {
      success: false,
      path: input.path,
      message: `파일을 찾을 수 없습니다: ${input.path}`,
      content: '',
      node: {} as never,
    };
  }

  const doc = parseDocument(input.path, content, mtime);
  const nodeResult = buildKnowledgeNode(doc);

  if (!nodeResult.success || !nodeResult.node) {
    return {
      success: false,
      path: input.path,
      message: `문서 파싱 실패: ${nodeResult.error}`,
      content,
      node: {} as never,
      warnings: nodeResult.error ? [nodeResult.error] : undefined,
    };
  }

  return {
    success: true,
    path: input.path,
    message: '문서를 성공적으로 읽었습니다.',
    content,
    node: nodeResult.node,
  };
}
