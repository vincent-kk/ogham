/**
 * @file coffaen-delete.ts
 * @description coffaen_delete 도구 핸들러 — 문서 삭제 (Layer 1 삭제 금지, backlink 경고)
 */
import { unlink } from 'node:fs/promises';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/document-parser.js';
import { Layer } from '../../types/common.js';
import type { CoffaenCrudResult, CoffaenDeleteInput } from '../../types/mcp.js';
import { appendStaleNode, getBacklinks, removeBacklinks } from '../shared.js';

/**
 * coffaen_delete 핸들러
 * Layer 1 문서 삭제는 항상 금지.
 */
export async function handleCoffaenDelete(
  vaultPath: string,
  input: CoffaenDeleteInput,
): Promise<CoffaenCrudResult> {
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
      message: `파일을 찾을 수 없습니다: ${input.path}`,
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
        'Layer 1 (Core Identity) 문서는 삭제할 수 없습니다. identity-guardian에게 문의하세요.',
    };
  }

  // Backlink 경고 확인
  const backlinks = await getBacklinks(vaultPath, input.path);
  if (backlinks.length > 0 && !input.force) {
    return {
      success: false,
      path: input.path,
      message: `삭제 불가: ${backlinks.length}개 문서가 이 문서를 참조합니다. force=true로 강제 삭제 가능합니다.`,
      warnings: backlinks.map((src) => `참조 문서: ${src}`),
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
      ? [`경고: ${backlinks.length}개 문서의 backlink가 끊어졌습니다.`]
      : undefined;

  return {
    success: true,
    path: input.path,
    message: `문서가 삭제되었습니다: ${input.path}`,
    warnings,
  };
}
