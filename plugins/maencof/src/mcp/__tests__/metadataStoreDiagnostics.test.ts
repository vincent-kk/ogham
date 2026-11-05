/** @file metadataStoreDiagnostics.test.ts MCP 저장소 생성 경로의 실제 오류 로그 연결 검사. */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CACHE_FILES } from '../../constants/cacheFiles.js';
import { readErrorLog } from '../../core/errorLog/index.js';
import { MetadataStore } from '../../core/indexer/metadataStore/index.js';
import type { KnowledgeGraph } from '../../types/graph.js';
import { invalidateCache } from '../server/graphCache/graphCache.js';
import { triggerBootRebuildIfStale } from '../server/middlewares/backgroundRebuild.js';
import { ensureFreshGraphNonBlocking } from '../server/middlewares/freshnessGuard.js';
import { runMutateSideEffects } from '../server/middlewares/mutateSideEffects.js';
import { mergeStaleNodesIntoGraph } from '../server/middlewares/partialReindex.js';
import { walkVaultForExternalChanges } from '../server/middlewares/vaultWalk.js';
import { handleKgBuild } from '../tools/kgBuild/operations/handleKgBuild.js';
import { handleKgStatus } from '../tools/kgStatus/kgStatus.js';

describe('MCP metadata load diagnostics', () => {
  let vaultPath: string;
  let graph: KnowledgeGraph;

  beforeEach(async () => {
    invalidateCache();
    vaultPath = await mkdtemp(join(tmpdir(), 'maencof-mcp-load-errors-'));
    await mkdir(join(vaultPath, '.maencof-meta'));
    graph = {
      nodes: new Map(),
      edges: [],
      nodeCount: 0,
      edgeCount: 0,
      builtAt: '2026-06-21T00:00:00Z',
    };
    await new MetadataStore(vaultPath).saveGraph(graph);
  });

  afterEach(async () => {
    invalidateCache();
    await rm(vaultPath, { recursive: true, force: true });
  });

  it.each([
    ['vault-walk-load', CACHE_FILES.SNAPSHOT],
    ['mutate-side-effects-load', CACHE_FILES.STALE_NODES],
    ['partial-reindex-load', CACHE_FILES.STALE_NODES],
    ['boot-rebuild-load', CACHE_FILES.STALE_NODES],
    ['freshness-guard-load', CACHE_FILES.STALE_NODES],
    ['kg-build-load', CACHE_FILES.SNAPSHOT],
    ['kg-status-load', CACHE_FILES.STALE_NODES],
  ])('records %s when its cached data is corrupt', async (hook, file) => {
    await writeFile(join(vaultPath, '.maencof', file), '{broken json');

    switch (hook) {
      case 'vault-walk-load':
        await walkVaultForExternalChanges(vaultPath);
        break;
      case 'mutate-side-effects-load':
        await runMutateSideEffects(vaultPath, 'read', null);
        break;
      case 'partial-reindex-load':
        await mergeStaleNodesIntoGraph(vaultPath, graph);
        break;
      case 'boot-rebuild-load':
        await triggerBootRebuildIfStale(vaultPath);
        break;
      case 'freshness-guard-load':
        await ensureFreshGraphNonBlocking(vaultPath);
        break;
      case 'kg-build-load':
        await handleKgBuild(vaultPath, { force: false });
        break;
      case 'kg-status-load':
        await handleKgStatus(vaultPath, graph, {});
        break;
    }

    expect(readErrorLog(vaultPath)).toEqual([
      expect.objectContaining({
        hook,
        error: expect.stringContaining('SyntaxError'),
      }),
    ]);
  });
});
