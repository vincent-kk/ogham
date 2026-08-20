/**
 * @file maencofMove.ts
 * @description `move` 도구 핸들러 — 문서 Layer 간 이동 (전이)
 */
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { basename, dirname } from 'node:path';

import {
  FLAT_LAYERS,
  L3_SUBDIR,
  LAYER_DIR,
} from '../../../constants/architecture.js';
import { ARCHIVE_DIR } from '../../../constants/directories.js';
import { MAX_FILENAME_SUBDIR_DEPTH } from '../../../constants/filename.js';
import { FRONTMATTER_REGEX } from '../../../constants/regexes.js';
import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/documentParser/index.js';
import { resolveWithinVault } from '../../../core/pathGuard/index.js';
import { parseYamlFrontmatter } from '../../../core/yamlParser/index.js';
import { Layer } from '../../../types/common.js';
import { validateFrontmatter } from '../../../types/frontmatter.js';
import type {
  MaencofCrudResult,
  MaencofMoveInput,
} from '../../../types/mcp.js';

/**
 * Frontmatter의 layer 필드를 갱신한다.
 * sub_layer 와 L5 전용 필드(buffer_type · promotion_target · source_context)도 함께 처리한다.
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
  if (options?.targetSubLayer)
    if (/^sub_layer:.*$/m.test(yaml))
      yaml = yaml.replace(
        /^sub_layer:.*$/m,
        `sub_layer: ${options.targetSubLayer}`,
      );
    else yaml += `\nsub_layer: ${options.targetSubLayer}`;
  else
    // 대상 layer에 sub_layer가 적용되지 않으면 제거
    yaml = yaml.replace(/\n?^sub_layer:.*$/m, '');

  // L5 → 다른 레이어 이동 시 L5 전용 필드 제거
  if (options?.stripBufferFields)
    for (const field of ['buffer_type', 'promotion_target', 'source_context'])
      yaml = yaml.replace(new RegExp(`\\n?^${field}:.*$`, 'm'), '');

  return content.replace(match[0], `---\n${yaml}\n---\n`);
}

/** target_subdirectory 세그먼트 허용 문자 — 기존 디렉토리 실명과 맞아야 하므로 정규화 대상이 아니다. */
const SUBDIRECTORY_SEGMENT_PATTERN = /^[A-Za-z0-9가-힣._-]+$/;

/** 대상 레이어 밖으로 새는 첫 세그먼트 — 레이어 실명 + 서고. 대소문자 무관 비교용 소문자 셋. */
const RESERVED_SUBDIRECTORY_ROOTS: ReadonlySet<string> = new Set(
  [...Object.values(LAYER_DIR), ARCHIVE_DIR].map((dir) => dir.toLowerCase()),
);

/**
 * target_subdirectory 입력을 검증한다.
 *
 * 파일명 힌트(sanitizeSegment)와 달리 디렉토리 세그먼트는 이미 존재하는 실명과
 * 맞아야 하므로 정규화하지 않는다 — 세그먼트는 원형 그대로 보존되고, 통과하지
 * 못하는 입력은 조용한 근사치 대신 에러가 된다.
 *
 * @param subdirectory - 도구 입력 원문
 * @returns 검증된 세그먼트 목록, 또는 거부 사유
 */
function resolveTargetSubdirectory(
  subdirectory: string,
): { segments: string[] } | { error: string } {
  if (subdirectory.split(/[/\\]/).some((segment) => segment === '..'))
    return {
      error:
        'Path traversal detected: ".." segments are not allowed in target_subdirectory',
    };

  const segments = subdirectory
    .split('/')
    .filter((segment) => segment.length > 0);

  const hidden = segments.find((segment) => segment.startsWith('.'));
  if (hidden !== undefined)
    return {
      error: `Invalid target_subdirectory segment "${hidden}": segments must not start with "."`,
    };

  const invalid = segments.find(
    (segment) => !SUBDIRECTORY_SEGMENT_PATTERN.test(segment),
  );
  if (invalid !== undefined)
    return {
      error: `Invalid target_subdirectory segment "${invalid}": only letters, digits, Korean, ".", "_", "-" are allowed`,
    };

  const first = segments[0];
  if (
    first !== undefined &&
    RESERVED_SUBDIRECTORY_ROOTS.has(first.toLowerCase())
  )
    return {
      error: `target_subdirectory must not start with a layer or archive directory ("${first}"): it resolves under the target layer. The archive (${ARCHIVE_DIR}) lives outside the knowledge graph — move archive files with a filesystem move plus a frontmatter edit instead.`,
    };

  if (segments.length > MAX_FILENAME_SUBDIR_DEPTH)
    return {
      error: `Subdirectory depth exceeds limit (${MAX_FILENAME_SUBDIR_DEPTH}): ${subdirectory}`,
    };
  return { segments };
}

/**
 * `move` 핸들러 — Layer 간 문서 전이
 * WAL 기반 원자적 이동: 쓰기 → 확인 → 삭제 순서
 */
export async function handleMaencofMove(
  vaultPath: string,
  input: MaencofMoveInput,
): Promise<MaencofCrudResult> {
  const resolvedSrc = resolveWithinVault(vaultPath, input.path);
  if ('error' in resolvedSrc)
    return { success: false, path: input.path, message: resolvedSrc.error };
  const srcAbsPath = resolvedSrc.absolutePath;

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
  if (!targetLayerDir)
    return {
      success: false,
      path: input.path,
      message: `Invalid target Layer: ${input.target_layer}`,
    };

  if (input.target_subdirectory && FLAT_LAYERS.includes(targetLayerNum))
    return {
      success: false,
      path: input.path,
      message: `Layer ${targetLayerNum} is flat — subdirectories are not allowed`,
    };

  // 현재 Layer 파악
  const doc = parseDocument(input.path, content, mtime);
  const nodeResult = buildKnowledgeNode(doc, { allowNonLayerPath: true });

  if (nodeResult.success && nodeResult.node?.layer === Layer.L1_CORE)
    return {
      success: false,
      path: input.path,
      message: 'Layer 1 (Core Identity) documents cannot be moved.',
    };

  // Moving a document INTO Layer 1 must satisfy the L1 gist contract. move takes
  // no content input, so the document must already carry a gist (add via update first).
  if (
    targetLayerNum === Layer.L1_CORE &&
    !(
      typeof nodeResult.node?.gist === 'string' &&
      nodeResult.node.gist.trim().length > 0
    )
  )
    return {
      success: false,
      path: input.path,
      message:
        'Moving a document to Layer 1 requires it to already carry a `gist`. Add one via update first, then move.',
    };

  // 같은 레이어이면 서브레이어/서브디렉토리 재배치일 때만 이동 허용
  if (
    nodeResult.success &&
    nodeResult.node?.layer === targetLayerNum &&
    !input.target_sub_layer &&
    !input.target_subdirectory
  )
    return {
      success: false,
      path: input.path,
      message: `Already in Layer ${targetLayerNum}.`,
    };

  // 대상 경로 계산 (서브레이어 + 서브디렉토리 포함)
  const filename = basename(input.path);
  // L3 만 서브레이어를 가지며, L5 는 평면 구조다
  const subDir =
    targetLayerNum === 3 && input.target_sub_layer
      ? (L3_SUBDIR[input.target_sub_layer] ?? '')
      : '';

  let subdirectoryPath = '';
  if (input.target_subdirectory) {
    const subdirectoryResult = resolveTargetSubdirectory(
      input.target_subdirectory,
    );
    if ('error' in subdirectoryResult)
      return {
        success: false,
        path: input.path,
        message: subdirectoryResult.error,
      };
    subdirectoryPath = subdirectoryResult.segments.join('/');
  }

  const newRelativePath = [targetLayerDir, subDir, subdirectoryPath, filename]
    .filter((part) => part.length > 0)
    .join('/');
  const resolvedDst = resolveWithinVault(vaultPath, newRelativePath);
  if ('error' in resolvedDst)
    return { success: false, path: input.path, message: resolvedDst.error };
  const newAbsPath = resolvedDst.absolutePath;

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

  // L5(임시 수용소)에서 벗어나면 L5 전용 필드를 자동 제거한다 (승격 시 잔재 방지)
  const stripBufferFields =
    nodeResult.node?.layer === Layer.L5_CONTEXT &&
    targetLayerNum !== Layer.L5_CONTEXT;

  // Frontmatter layer + updated + sub_layer 갱신
  const updatedContent = updateLayerInFrontmatter(content, targetLayerNum, {
    targetSubLayer: input.target_sub_layer,
    stripBufferFields,
  });

  // ─── 객체 단계 검증 (read-path와 동일한 FrontmatterSchema 호출) ───
  const updatedFmYamlMatch = FRONTMATTER_REGEX.exec(updatedContent);
  const updatedFmObject = parseYamlFrontmatter(updatedFmYamlMatch?.[1] ?? '');
  const validation = validateFrontmatter(updatedFmObject);
  if (!validation.ok)
    return {
      success: false,
      path: input.path,
      message: `Frontmatter validation failed: ${validation.errors.join('; ')}`,
    };

  // WAL 기반 원자적 이동: 대상 쓰기 → 소스 삭제
  await mkdir(dirname(newAbsPath), { recursive: true });
  await writeFile(newAbsPath, updatedContent, 'utf-8');
  await unlink(srcAbsPath);

  return {
    success: true,
    path: newRelativePath,
    message: `Moved from ${input.path}`,
  };
}
