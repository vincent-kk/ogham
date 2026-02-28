/**
 * @file coffaen-move.ts
 * @description coffaen_move 도구 핸들러 — 문서 Layer 간 이동 (전이)
 */
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/document-parser.js';
import { Layer } from '../../types/common.js';
import type { CoffaenCrudResult, CoffaenMoveInput } from '../../types/mcp.js';
import { appendStaleNode } from '../shared.js';

/** Layer → 디렉토리 매핑 */
const LAYER_DIR: Record<number, string> = {
  [Layer.L1_CORE]: '01_Core',
  [Layer.L2_DERIVED]: '02_Derived',
  [Layer.L3_EXTERNAL]: '03_External',
  [Layer.L4_ACTION]: '04_Action',
};

/**
 * Frontmatter의 layer 필드를 갱신한다.
 */
function updateLayerInFrontmatter(content: string, newLayer: number): string {
  const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) return content;

  const today = new Date().toISOString().slice(0, 10);
  let yaml = match[1];
  yaml = yaml.replace(/^layer:.*$/m, `layer: ${newLayer}`);
  yaml = yaml.replace(/^updated:.*$/m, `updated: ${today}`);

  return content.replace(match[0], `---\n${yaml}\n---\n`);
}

/**
 * coffaen_move 핸들러 — Layer 간 문서 전이
 * WAL 기반 원자적 이동: 쓰기 → 확인 → 삭제 순서
 */
export async function handleCoffaenMove(
  vaultPath: string,
  input: CoffaenMoveInput,
): Promise<CoffaenCrudResult> {
  const srcAbsPath = join(vaultPath, input.path);

  // 소스 파일 확인
  let content: string;
  let mtime: number;
  try {
    const [raw, stats] = await Promise.all([
      readFile(srcAbsPath, 'utf-8'),
      stat(srcAbsPath),
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

  // Layer 검증
  const targetLayerNum = input.target_layer as number;
  const targetLayerDir = LAYER_DIR[targetLayerNum];
  if (!targetLayerDir) {
    return {
      success: false,
      path: input.path,
      message: `유효하지 않은 목표 Layer: ${input.target_layer}`,
    };
  }

  // 현재 Layer 파악
  const doc = parseDocument(input.path, content, mtime);
  const nodeResult = buildKnowledgeNode(doc);

  if (nodeResult.success && nodeResult.node?.layer === Layer.L1_CORE) {
    return {
      success: false,
      path: input.path,
      message: 'Layer 1 (Core Identity) 문서는 이동할 수 없습니다.',
    };
  }

  if (nodeResult.success && nodeResult.node?.layer === targetLayerNum) {
    return {
      success: false,
      path: input.path,
      message: `이미 Layer ${targetLayerNum}에 있습니다.`,
    };
  }

  // 대상 경로 계산
  const filename = basename(input.path);
  const newRelativePath = `${targetLayerDir}/${filename}`;
  const newAbsPath = join(vaultPath, newRelativePath);

  // 대상 파일 중복 확인
  try {
    await access(newAbsPath);
    return {
      success: false,
      path: input.path,
      message: `대상 경로에 파일이 이미 존재합니다: ${newRelativePath}`,
    };
  } catch {
    // 없음 → 정상
  }

  // Frontmatter layer + updated 갱신
  const updatedContent = updateLayerInFrontmatter(content, targetLayerNum);

  // WAL 기반 원자적 이동: 대상 쓰기 → 소스 삭제
  await mkdir(dirname(newAbsPath), { recursive: true });
  await writeFile(newAbsPath, updatedContent, 'utf-8');
  await unlink(srcAbsPath);

  // stale-nodes 업데이트 (소스 + 대상 모두)
  await Promise.all([
    appendStaleNode(vaultPath, input.path),
    appendStaleNode(vaultPath, newRelativePath),
  ]);

  const warnings: string[] = [];
  if (input.reason) {
    warnings.push(`전이 사유: ${input.reason}`);
  }
  if (input.confidence !== undefined) {
    warnings.push(`신뢰도: ${input.confidence}`);
  }

  return {
    success: true,
    path: newRelativePath,
    message: `문서가 이동되었습니다: ${input.path} → ${newRelativePath}`,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
