/**
 * @file coffaen-create.ts
 * @description coffaen_create 도구 핸들러 — 새 기억 문서 생성
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { Layer } from '../../types/common.js';
import { LAYER_DIR } from '../../types/common.js';
import type { CoffaenCreateInput, CoffaenCrudResult } from '../../types/mcp.js';
import { appendStaleNode } from '../shared.js';

/**
 * 파일명 힌트로부터 안전한 파일명을 생성한다.
 */
function sanitizeFilename(hint: string): string {
  return hint
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
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

/**
 * Frontmatter YAML 문자열을 생성한다.
 */
function buildFrontmatter(input: CoffaenCreateInput): string {
  const today = new Date().toISOString().slice(0, 10);
  const tagsYaml = `[${input.tags.map((t) => t).join(', ')}]`;

  const lines = [
    '---',
    `created: ${today}`,
    `updated: ${today}`,
    `tags: ${tagsYaml}`,
    `layer: ${input.layer}`,
  ];

  if (input.title) lines.push(`title: ${input.title}`);
  if (input.source) lines.push(`source: ${input.source}`);
  if (input.expires) lines.push(`expires: ${input.expires}`);

  lines.push('---');
  return lines.join('\n');
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
 * coffaen_create 핸들러
 *
 * @param vaultPath - vault 루트 절대 경로
 * @param input - 도구 입력
 */
export async function handleCoffaenCreate(
  vaultPath: string,
  input: CoffaenCreateInput,
): Promise<CoffaenCrudResult> {
  const layerDir = LAYER_DIR[input.layer as Layer];
  if (!layerDir) {
    return {
      success: false,
      path: '',
      message: `유효하지 않은 Layer: ${input.layer}`,
    };
  }

  // 파일명 결정
  const filename = input.filename
    ? sanitizeFilename(input.filename) +
      (input.filename.endsWith('.md') ? '' : '.md')
    : generateFilename(input.title, input.tags);

  const relativePath = `${layerDir}/${filename}`;
  const absolutePath = join(vaultPath, relativePath);

  // 중복 파일 확인
  try {
    await access(absolutePath);
    return {
      success: false,
      path: relativePath,
      message: `파일이 이미 존재합니다: ${relativePath}`,
    };
  } catch {
    // 파일 없음 → 정상
  }

  // 문서 내용 조립
  const frontmatter = buildFrontmatter(input);
  const title = input.title ? `# ${input.title}\n\n` : '';
  const fileContent = `${frontmatter}\n${title}${input.content}`;

  // 디렉토리 생성 + 파일 쓰기
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, fileContent, 'utf-8');

  // Invalidate stale-nodes (new node added)
  await appendStaleNode(vaultPath, relativePath);

  // backlink-index 갱신 (링크 추출)
  const metaDir = join(vaultPath, '.coffaen-meta');
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
    message: `문서가 생성되었습니다: ${relativePath}`,
  };
}
