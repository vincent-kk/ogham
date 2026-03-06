/**
 * @file maencof-create.ts
 * @description maencof_create 도구 핸들러 — 새 기억 문서 생성
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { deduplicateContent } from '../../core/content-dedup.js';
import { quoteYamlValue } from '../../core/yaml-parser.js';
import type { L3SubLayer, L5SubLayer, Layer } from '../../types/common.js';
import { L3_SUBDIR, L5_SUBDIR, LAYER_DIR } from '../../types/common.js';
import { AUTO_GENERATED_FM_KEYS } from '../../types/frontmatter.js';
import type { MaencofCreateInput, MaencofCrudResult } from '../../types/mcp.js';

/**
 * 파일명 힌트로부터 안전한 파일명을 생성한다.
 */
function sanitizeFilename(hint: string): string {
  const parts = hint.split('/');
  const sanitized = parts
    .map((part) =>
      part
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80),
    )
    .filter((v) => !!v);
  return sanitized.join('/');
}

/**
 * 제목으로부터 파일명을 자동 생성한다.
 */
function generateFilename(title?: string, tags?: string[]): string {
  if (title) {
    return sanitizeFilename(title) + '.md';
  }
  if (tags && tags.length > 0) {
    return sanitizeFilename(tags[0]) + '.md';
  }
  return `note-${Date.now()}.md`;
}

/** Frontmatter build result */
interface FrontmatterBuildResult {
  /** Generated YAML string (including --- delimiters) */
  yaml: string;
  /** All keys that buildFrontmatter can produce (for dedup detection) */
  possibleKeys: string[];
}

/**
 * Frontmatter YAML 문자열을 생성한다.
 *
 * `possibleKeys`는 이 함수가 생성할 수 있는 모든 키 목록을 반환한다.
 * 조건부 키(sub_layer, title 등)도 포함되어, dedup이 content 내
 * 잠재적 중복을 놓치지 않도록 한다.
 */
function buildFrontmatter(input: MaencofCreateInput): FrontmatterBuildResult {
  const today = new Date().toISOString().slice(0, 10);
  const tagsYaml = `[${input.tags.map((t) => quoteYamlValue(t)).join(', ')}]`;

  const lines = [
    '---',
    `created: ${today}`,
    `updated: ${today}`,
    `tags: ${tagsYaml}`,
    `layer: ${input.layer}`,
  ];

  if (input.sub_layer) lines.push(`sub_layer: ${input.sub_layer}`);
  if (input.title) lines.push(`title: ${quoteYamlValue(input.title)}`);
  if (input.source) lines.push(`source: ${quoteYamlValue(input.source)}`);
  if (input.expires) lines.push(`expires: ${input.expires}`);

  lines.push('---');

  return {
    yaml: lines.join('\n'),
    possibleKeys: [...AUTO_GENERATED_FM_KEYS],
  };
}

/**
 * backlink-index.json에 새 아웃바운드 링크를 추가한다.
 */
async function updateBacklinkIndex(
  metaDir: string,
  sourcePath: string,
  targetPaths: string[],
): Promise<void> {
  const indexPath = join(metaDir, 'backlink-index.json');
  let index: Record<string, string[]> = {};

  try {
    const raw = await readFile(indexPath, 'utf-8');
    index = JSON.parse(raw) as Record<string, string[]>;
  } catch {
    // 파일 없으면 빈 인덱스로 시작
  }

  for (const target of targetPaths) {
    if (!index[target]) index[target] = [];
    if (!index[target].includes(sourcePath)) {
      index[target].push(sourcePath);
    }
  }

  await mkdir(metaDir, { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * maencof_create 핸들러
 *
 * @param vaultPath - vault 루트 절대 경로
 * @param input - 도구 입력
 */
export async function handleMaencofCreate(
  vaultPath: string,
  input: MaencofCreateInput,
): Promise<MaencofCrudResult> {
  const layerDir = LAYER_DIR[input.layer as Layer];
  if (!layerDir) {
    return {
      success: false,
      path: '',
      message: `Invalid Layer: ${input.layer}`,
    };
  }

  // Path traversal 방어 (sanitize 전 raw input 검사)
  if (input.filename && input.filename.includes('..')) {
    return {
      success: false,
      path: '',
      message:
        'Path traversal detected: ".." segments are not allowed in filename',
    };
  }

  // 파일명 결정
  const filename = input.filename
    ? sanitizeFilename(input.filename) +
      (input.filename.endsWith('.md') ? '' : '.md')
    : generateFilename(input.title, input.tags);

  // Sub-layer 디렉토리 결정
  let subDir = '';
  if (input.sub_layer) {
    const layerNum = input.layer as Layer;
    if (layerNum === 3 && input.sub_layer in L3_SUBDIR) {
      subDir = L3_SUBDIR[input.sub_layer as L3SubLayer];
    } else if (layerNum === 5 && input.sub_layer in L5_SUBDIR) {
      subDir = L5_SUBDIR[input.sub_layer as L5SubLayer];
    }
  }

  const relativePath = subDir
    ? `${layerDir}/${subDir}/${filename}`
    : `${layerDir}/${filename}`;
  const absolutePath = join(vaultPath, relativePath);

  // 중복 파일 확인
  try {
    await access(absolutePath);
    return {
      success: false,
      path: relativePath,
      message: `File already exists: ${relativePath}`,
    };
  } catch {
    // 파일 없음 → 정상
  }

  // 문서 내용 조립 (content 중복 제거 후)
  const { yaml: frontmatter, possibleKeys } = buildFrontmatter(input);
  const title = input.title ? `# ${input.title}\n\n` : '';
  const dedup = deduplicateContent(input.content, {
    title: input.title,
    generatedKeys: possibleKeys,
  });
  const fileContent = `${frontmatter}\n${title}${dedup.content}`;

  // 디렉토리 생성 + 파일 쓰기
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, fileContent, 'utf-8');

  // backlink-index 갱신 (링크 추출)
  const metaDir = join(vaultPath, '.maencof-meta');
  const linkMatches = [
    ...input.content.matchAll(/\[([^\]]*)\]\(([^)]+\.md)\)/g),
  ];
  const linkedPaths = linkMatches
    .map((m) => m[2])
    .filter((href) => !href.startsWith('http'));

  if (linkedPaths.length > 0) {
    try {
      await updateBacklinkIndex(metaDir, relativePath, linkedPaths);
    } catch {
      // backlink 갱신 실패는 경고만
    }
  }

  return {
    success: true,
    path: relativePath,
    message: `Document created: ${relativePath}`,
    ...(dedup.warnings.length > 0 && { warnings: dedup.warnings }),
  };
}
