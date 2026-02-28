/**
 * @file shared.ts
 * @description MCP 도구 공통 유틸리티
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * stale-nodes.json에 경로를 추가한다 (append-only).
 */
export async function appendStaleNode(
  vaultPath: string,
  path: string,
): Promise<void> {
  const cacheDir = join(vaultPath, '.coffaen');
  const staleNodesPath = join(cacheDir, 'stale-nodes.json');

  let stale: { paths: string[]; updatedAt: string } = {
    paths: [],
    updatedAt: new Date().toISOString(),
  };

  try {
    const raw = await readFile(staleNodesPath, 'utf-8');
    stale = JSON.parse(raw) as typeof stale;
  } catch {
    // 없으면 초기화
  }

  if (!stale.paths.includes(path)) {
    stale.paths.push(path);
  }
  stale.updatedAt = new Date().toISOString();

  await mkdir(cacheDir, { recursive: true });
  await writeFile(staleNodesPath, JSON.stringify(stale, null, 2), 'utf-8');
}

/**
 * backlink-index.json에서 특정 소스의 링크를 제거한다.
 */
export async function removeBacklinks(
  vaultPath: string,
  sourcePath: string,
): Promise<void> {
  const metaDir = join(vaultPath, '.coffaen-meta');
  const indexPath = join(metaDir, 'backlink-index.json');

  let index: Record<string, string[]> = {};
  try {
    const raw = await readFile(indexPath, 'utf-8');
    index = JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return;
  }

  // 소스 경로가 출처인 항목 제거
  let changed = false;
  for (const target of Object.keys(index)) {
    const before = index[target].length;
    index[target] = index[target].filter((src) => src !== sourcePath);
    if (index[target].length !== before) changed = true;
    // 빈 배열 제거
    if (index[target].length === 0) {
      delete index[target];
    }
  }

  if (changed) {
    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}

/**
 * backlink-index.json에서 특정 대상의 backlink를 조회한다.
 */
export async function getBacklinks(
  vaultPath: string,
  targetPath: string,
): Promise<string[]> {
  const metaDir = join(vaultPath, '.coffaen-meta');
  const indexPath = join(metaDir, 'backlink-index.json');

  try {
    const raw = await readFile(indexPath, 'utf-8');
    const index = JSON.parse(raw) as Record<string, string[]>;
    return index[targetPath] ?? [];
  } catch {
    return [];
  }
}

/** JSON.stringify replacer — Map/Set → 일반 객체/배열 */
export function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}

/** MCP 성공 응답 포맷 */
export function toolResult(result: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, mapReplacer, 2),
      },
    ],
  };
}

/** MCP 에러 응답 포맷 */
export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}
