/**
 * @file maencof-delete.ts
 * @description maencof_delete 도구 핸들러 — 문서 삭제 (Layer 1 삭제 금지, backlink 경고)
 */
import { unlink } from 'node:fs/promises';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/document-parser.js';
import { Layer } from '../../types/common.js';
import type { MaencofCrudResult, MaencofDeleteInput } from '../../types/mcp.js';
import { appendStaleNode, getBacklinks, removeBacklinks } from '../shared.js';

/**
 * maencof_delete 핸들러
 * Layer 1 문서 삭제는 항상 금지.
 */
export async function handleMaencofDelete(
  vaultPath: string,
  input: MaencofDeleteInput,
): Promise<MaencofCrudResult> {
  const absolutePath = join(vaultPath, input.path);

  // 파일 존재 확인 + 파싱
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
    };
  }

  // Layer 확인 (Layer 1 삭제 금지)
  const doc = parseDocument(input.path, content, mtime);
  const nodeResult = buildKnowledgeNode(doc);

  if (nodeResult.success && nodeResult.node?.layer === Layer.L1_CORE) {
    return {
      success: false,
      path: input.path,
      message:
        'Layer 1 (Core Identity) documents cannot be deleted. Please contact the identity-guardian agent.',
    };
  }

  // Backlink 경고 확인
  const backlinks = await getBacklinks(vaultPath, input.path);
  if (backlinks.length > 0 && !input.force) {
    return {
      success: false,
      path: input.path,
      message: `Cannot delete: ${backlinks.length} document(s) reference this document. Use force=true to force deletion.`,
      warnings: backlinks.map((src) => `Referenced by: ${src}`),
    };
  }

  // 삭제 실행
  await unlink(absolutePath);

  // stale-nodes 추가 + backlink 인덱스 정리
  await Promise.all([
    appendStaleNode(vaultPath, input.path),
    removeBacklinks(vaultPath, input.path),
  ]);

  const warnings =
    backlinks.length > 0
      ? [`Warning: ${backlinks.length} document backlink(s) are now broken.`]
      : undefined;

  return {
    success: true,
    path: input.path,
    message: `Document deleted: ${input.path}`,
    warnings,
  };
}
