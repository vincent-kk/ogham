/**
 * @file maencof-read.ts
 * @description maencof_read 도구 핸들러 — 문서 읽기 + 관련 컨텍스트
 */
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/document-parser.js';
import { isLayer1Path } from '../../types/layer.js';
import type { MaencofReadInput, MaencofReadResult } from '../../types/mcp.js';

/**
 * maencof_read 핸들러
 */
export async function handleMaencofRead(
  vaultPath: string,
  input: MaencofReadInput,
): Promise<MaencofReadResult> {
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
      message: `File not found: ${input.path}`,
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
      message: `Document parsing failed: ${nodeResult.error}`,
      content,
      node: {} as never,
      warnings: nodeResult.error ? [nodeResult.error] : undefined,
    };
  }

  const warnings: string[] = [];
  if (isLayer1Path(input.path)) {
    warnings.push(
      'This is a Layer 1 (01_Core/) document. memory-organizer only allows indirect access via kg_navigate.',
    );
  }

  return {
    success: true,
    path: input.path,
    message: 'Document read successfully.',
    content,
    node: nodeResult.node,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
