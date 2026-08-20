/**
 * @file buildArchiveClusterIndex.test.ts
 * @description 서고 cluster_key 열거 인덱스 — 그룹핑·정렬·손상 스킵과
 * handleKgBuild 부착(노드 수 불변·저장 왕복) 검증.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetadataStore } from '../../core/indexer/metadataStore/index.js';
import { handleKgBuild } from '../../mcp/tools/kgBuild/index.js';
import { buildArchiveClusterIndex } from '../../mcp/tools/kgBuild/operations/buildArchiveClusterIndex.js';

/**
 * 실측 서고 frontmatter 형태(layer·cluster_key·title·updated·tags)의 문서 원문을 만든다.
 *
 * @param options - frontmatter 값 (clusterKey 생략 시 cluster_key 없는 문서)
 * @returns frontmatter + H1 본문 마크다운 원문
 */
function makeDoc(options: {
  clusterKey?: string;
  title: string;
  updated: string;
  tags: string[];
}): string {
  const { clusterKey, title, updated, tags } = options;
  return [
    '---',
    'layer: 4',
    ...(clusterKey === undefined ? [] : [`cluster_key: ${clusterKey}`]),
    `title: ${title}`,
    `created: ${updated}`,
    `updated: ${updated}`,
    `tags: [${tags.join(', ')}]`,
    '---',
    '',
    `# ${title}`,
    '',
  ].join('\n');
}

/**
 * vault 상대 경로에 문서를 쓴다 (중간 디렉토리 자동 생성).
 *
 * @param vault - 임시 vault 루트
 * @param relPath - vault 기준 상대 경로
 * @param content - 파일 내용
 */
async function writeDoc(
  vault: string,
  relPath: string,
  content: string,
): Promise<void> {
  await mkdir(join(vault, dirname(relPath)), { recursive: true });
  await writeFile(join(vault, relPath), content, 'utf-8');
}

describe('buildArchiveClusterIndex', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-archive-index-'));
    await writeDoc(
      vault,
      '99_Archive/geeknews/gn-1.md',
      makeDoc({
        clusterKey: 'geeknews',
        title: 'GN One',
        updated: '2026-08-01',
        tags: ['geeknews'],
      }),
    );
    await writeDoc(
      vault,
      '99_Archive/geeknews/gn-2.md',
      makeDoc({
        clusterKey: 'geeknews',
        title: 'GN Two',
        updated: '2026-08-20',
        tags: ['geeknews'],
      }),
    );
    await writeDoc(
      vault,
      '99_Archive/cve/cve-1.md',
      makeDoc({
        clusterKey: 'cve',
        title: 'CVE One',
        updated: '2026-08-10',
        tags: ['cve'],
      }),
    );
    await writeDoc(
      vault,
      '99_Archive/actions/no-key.md',
      makeDoc({ title: 'No Key', updated: '2026-08-05', tags: ['action'] }),
    );
    await writeDoc(
      vault,
      '99_Archive/geeknews/broken.md',
      '---\nlayer: 4\ncluster_key: geeknews\n# frontmatter 구획 미폐합',
    );
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('cluster_key 별로 그룹핑해 updated 내림차순(동률 path 사전순)으로 정렬한다', async () => {
    const index = await buildArchiveClusterIndex(vault);
    expect([...index.keys()].sort()).toEqual(['cve', 'geeknews']);
    expect(index.get('geeknews')!.map((m) => m.path)).toEqual([
      '99_Archive/geeknews/gn-2.md',
      '99_Archive/geeknews/gn-1.md',
    ]);
    expect(index.get('geeknews')![0]).toMatchObject({
      clusterKey: 'geeknews',
      title: 'GN Two',
      updated: '2026-08-20',
      tags: ['geeknews'],
    });
  });

  it('cluster_key 없는 문서와 frontmatter 손상 문서는 제외하고 계속한다', async () => {
    const index = await buildArchiveClusterIndex(vault);
    const allPaths = [...index.values()].flat().map((m) => m.path);
    expect(allPaths).not.toContain('99_Archive/actions/no-key.md');
    expect(allPaths).not.toContain('99_Archive/geeknews/broken.md');
  });
});

describe('handleKgBuild 아카이브 인덱스 부착', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), 'maencof-archive-build-'));
    await writeDoc(
      vault,
      '04_Action/note.md',
      makeDoc({ title: 'Note', updated: '2026-08-15', tags: ['action'] }),
    );
    await writeDoc(
      vault,
      '99_Archive/geeknews/gn-1.md',
      makeDoc({
        clusterKey: 'geeknews',
        title: 'GN One',
        updated: '2026-08-01',
        tags: ['geeknews'],
      }),
    );
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('handleKgBuild 가 인덱스를 그래프에 부착하고 저장하며 노드 수는 불변이다', async () => {
    const result = await handleKgBuild(vault, { force: true });
    expect(result.success).toBe(true);
    expect(result.nodeCount).toBe(1); // 서고 문서는 노드가 아니다
    const loaded = await new MetadataStore(vault).loadGraph();
    expect(loaded?.archiveClusterMembers?.get('geeknews')).toHaveLength(1);
  });
});
