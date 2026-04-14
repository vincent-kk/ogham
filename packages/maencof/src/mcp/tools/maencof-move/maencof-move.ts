/**
 * @file maencof-move.ts
 * @description `move` 도구 핸들러 — 문서 Layer 간 이동 (전이)
 */
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { FRONTMATTER_REGEX } from '../../../constants/regexes.js';
import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/document-parser/index.js';
import type { L3SubLayer, L5SubLayer } from '../../../types/common.js';
import { L3_SUBDIR, L5_SUBDIR, LAYER_DIR, Layer } from '../../../types/common.js';
import type { MaencofCrudResult, MaencofMoveInput } from '../../../types/mcp.js';

/**
 * Frontmatter의 layer 필드를 갱신한다.
 * sub_layer, buffer_type, promotion_target 필드도 함께 처리한다.
 */
function updateLayerInFrontmatter(
  content: string,
  newLayer: number,
  options?: {
    targetSubLayer?: string;
    stripBufferFields?: boolean;
  },
): string {
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) return content;

  const today = new Date().toISOString().slice(0, 10);
  let yaml = match[1];
  yaml = yaml.replace(/^layer:.*$/m, `layer: ${newLayer}`);
  yaml = yaml.replace(/^updated:.*$/m, `updated: ${today}`);

  // sub_layer 갱신 또는 제거
  if (options?.targetSubLayer) {
    if (/^sub_layer:.*$/m.test(yaml)) {
      yaml = yaml.replace(
        /^sub_layer:.*$/m,
        `sub_layer: ${options.targetSubLayer}`,
      );
    } else {
      yaml += `\nsub_layer: ${options.targetSubLayer}`;
    }
  } else {
    // 대상 layer에 sub_layer가 적용되지 않으면 제거
    yaml = yaml.replace(/\n?^sub_layer:.*$/m, '');
  }

  // L5-Buffer → 다른 레이어 이동 시 buffer 전용 필드 제거
  if (options?.stripBufferFields) {
    yaml = yaml.replace(/\n?^buffer_type:.*$/m, '');
    yaml = yaml.replace(/\n?^promotion_target:.*$/m, '');
  }

  return content.replace(match[0], `---\n${yaml}\n---\n`);
}

/**
 * `move` 핸들러 — Layer 간 문서 전이
 * WAL 기반 원자적 이동: 쓰기 → 확인 → 삭제 순서
 */
export async function handleMaencofMove(
  vaultPath: string,
  input: MaencofMoveInput,
): Promise<MaencofCrudResult> {
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
      message: `File not found: ${input.path}`,
    };
  }

  // Layer 검증
  const targetLayerNum = input.target_layer as Layer;
  const targetLayerDir = LAYER_DIR[targetLayerNum];
  if (!targetLayerDir) {
    return {
      success: false,
      path: input.path,
      message: `Invalid target Layer: ${input.target_layer}`,
    };
  }

  // 현재 Layer 파악
  const doc = parseDocument(input.path, content, mtime);
  const nodeResult = buildKnowledgeNode(doc);

  if (nodeResult.success && nodeResult.node?.layer === Layer.L1_CORE) {
    return {
      success: false,
      path: input.path,
      message: 'Layer 1 (Core Identity) documents cannot be moved.',
    };
  }

  const sourceSubLayer = nodeResult.success
    ? nodeResult.node?.subLayer
    : undefined;

  // 같은 레이어 + 같은 서브레이어이면 이동 불필요 (서브레이어 변경은 허용)
  if (
    nodeResult.success &&
    nodeResult.node?.layer === targetLayerNum &&
    !input.target_sub_layer
  ) {
    return {
      success: false,
      path: input.path,
      message: `Already in Layer ${targetLayerNum}.`,
    };
  }

  // 대상 경로 계산 (서브레이어 디렉토리 포함)
  const filename = basename(input.path);
  let subDir = '';
  if (input.target_sub_layer) {
    if (targetLayerNum === 3 && input.target_sub_layer in L3_SUBDIR) {
      subDir = L3_SUBDIR[input.target_sub_layer as L3SubLayer];
    } else if (targetLayerNum === 5 && input.target_sub_layer in L5_SUBDIR) {
      subDir = L5_SUBDIR[input.target_sub_layer as L5SubLayer];
    }
  }
  const newRelativePath = subDir
    ? `${targetLayerDir}/${subDir}/${filename}`
    : `${targetLayerDir}/${filename}`;
  const newAbsPath = join(vaultPath, newRelativePath);

  // 대상 파일 중복 확인
  try {
    await access(newAbsPath);
    return {
      success: false,
      path: input.path,
      message: `File already exists at target path: ${newRelativePath}`,
    };
  } catch {
    // 없음 → 정상
  }

  // L5-Buffer에서 이동 시 buffer 전용 필드 자동 제거
  const stripBufferFields = sourceSubLayer === 'buffer';

  // Frontmatter layer + updated + sub_layer 갱신
  const updatedContent = updateLayerInFrontmatter(content, targetLayerNum, {
    targetSubLayer: input.target_sub_layer,
    stripBufferFields,
  });

  // WAL 기반 원자적 이동: 대상 쓰기 → 소스 삭제
  await mkdir(dirname(newAbsPath), { recursive: true });
  await writeFile(newAbsPath, updatedContent, 'utf-8');
  await unlink(srcAbsPath);

  const warnings: string[] = [];
  if (input.reason) {
    warnings.push(`Transition reason: ${input.reason}`);
  }
  if (input.confidence !== undefined) {
    warnings.push(`Confidence: ${input.confidence}`);
  }

  return {
    success: true,
    path: newRelativePath,
    message: `Document moved: ${input.path} → ${newRelativePath}`,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
