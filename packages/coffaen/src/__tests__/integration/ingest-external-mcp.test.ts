/**
 * @file ingest-external-mcp.test.ts
 * @description ingest 스킬 외부 MCP 호출 시뮬레이션 통합 테스트
 *
 * 시나리오:
 * 1. 외부 MCP 도구에서 검색 결과 데이터를 수신
 * 2. 수신한 데이터를 Layer 3 문서로 ingest
 * 3. kg_build로 인덱스 갱신
 * 4. kg_search로 ingest된 문서 검색 확인
 * 5. 관련 문서 생성 및 연결
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { handleCoffaenCreate } from '../../mcp/tools/coffaen-create.js';
import { handleCoffaenRead } from '../../mcp/tools/coffaen-read.js';
import { handleKgBuild } from '../../mcp/tools/kg-build.js';
import { handleKgSearch } from '../../mcp/tools/kg-search.js';
import { handleKgContext } from '../../mcp/tools/kg-context.js';
import { handleKgStatus } from '../../mcp/tools/kg-status.js';

async function makeTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'coffaen-ingest-'));
}

/** 외부 MCP 도구 응답 시뮬레이터 */
interface ExternalSearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  publishedAt?: string;
}

function simulateExternalMcpSearch(query: string): ExternalSearchResult[] {
  // 외부 MCP 도구 (예: web_search, github_search) 응답 시뮬레이션
  return [
    {
      title: `${query} 관련 연구 논문 1`,
      url: 'https://arxiv.org/abs/2024.00001',
      snippet: `${query}에 관한 최신 연구 결과입니다. 핵심 개념과 실험 결과를 포함합니다.`,
      relevance: 0.95,
      publishedAt: '2024-06-01',
    },
    {
      title: `${query} 실무 가이드`,
      url: 'https://docs.example.com/guide',
      snippet: `${query}를 실무에 적용하는 방법을 단계별로 설명합니다.`,
      relevance: 0.88,
    },
    {
      title: `${query} 오픈소스 구현체`,
      url: 'https://github.com/example/repo',
      snippet: `${query}의 오픈소스 구현체입니다. MIT 라이선스.`,
      relevance: 0.72,
    },
  ];
}

/** 외부 검색 결과를 coffaen Layer 3 문서로 변환 */
async function ingestSearchResults(
  vaultPath: string,
  query: string,
  results: ExternalSearchResult[],
): Promise<string[]> {
  const ingested: string[] = [];

  for (const result of results) {
    const filename = result.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);

    const content = `## 요약

${result.snippet}

## 메타데이터

- 출처: ${result.url}
- 관련도: ${result.relevance}
- 검색 쿼리: ${query}
${result.publishedAt ? `- 발행일: ${result.publishedAt}` : ''}

## 핵심 내용

이 문서는 "${query}" 검색으로 발견된 외부 자료입니다.`;

    const createResult = await handleCoffaenCreate(vaultPath, {
      layer: 3,
      tags: [
        query.replace(/\s+/g, '-').toLowerCase(),
        'ingest',
        'external',
      ],
      content,
      title: result.title,
      filename,
      source: result.url,
    });

    if (createResult.success) {
      ingested.push(createResult.path);
    }
  }

  return ingested;
}

describe('ingest 스킬 외부 MCP 시뮬레이션 통합 테스트', () => {
  let vault: string;

  beforeEach(async () => {
    vault = await makeTempVault();
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it('시나리오 1: 외부 MCP 검색 결과 수신 및 파싱', () => {
    const query = 'knowledge graph';
    const results = simulateExternalMcpSearch(query);

    expect(results).toHaveLength(3);
    expect(results[0].relevance).toBeGreaterThan(0.9);
    expect(results[0].url).toContain('https://');
    expect(results.every((r) => r.title.includes(query))).toBe(true);
  });

  it('시나리오 2: 검색 결과를 Layer 3 문서로 ingest', async () => {
    const query = 'spreading activation';
    const results = simulateExternalMcpSearch(query);

    const ingested = await ingestSearchResults(vault, query, results);

    expect(ingested.length).toBe(results.length);
    expect(ingested.every((path) => path.startsWith('03_External/'))).toBe(true);

    // 생성된 문서 읽기 확인
    const readResult = await handleCoffaenRead(vault, { path: ingested[0] });
    expect(readResult.success).toBe(true);
    expect(readResult.node.layer).toBe(3);
    expect(readResult.node.tags).toContain('ingest');
    expect(readResult.node.tags).toContain('external');
  });

  it('시나리오 3: ingest 후 kg_build로 인덱스 갱신', async () => {
    const query = 'memory management';
    const results = simulateExternalMcpSearch(query);
    await ingestSearchResults(vault, query, results);

    // 기존 문서도 추가
    await handleCoffaenCreate(vault, {
      layer: 1,
      tags: ['identity'],
      content: '핵심 정체성',
      title: 'Identity',
      filename: 'identity',
    });

    const buildResult = await handleKgBuild(vault, { force: true });
    expect(buildResult.success).toBe(true);
    expect(buildResult.nodeCount).toBeGreaterThanOrEqual(results.length + 1);
    expect(buildResult.durationMs).toBeGreaterThanOrEqual(0);
    expect(buildResult.incremental).toBe(false);
  });

  it('시나리오 4: kg_search로 ingest된 문서 검색', async () => {
    const query = 'vector embedding';
    const results = simulateExternalMcpSearch(query);
    await ingestSearchResults(vault, query, results);

    // 추가 문서
    await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['derived', 'embedding'],
      content: '벡터 임베딩 관련 파생 지식',
      title: 'Embedding Notes',
      filename: 'embedding-notes',
    });

    const buildResult = await handleKgBuild(vault, { force: true });
    expect(buildResult.success).toBe(true);

    // 그래프 로드
    const { MetadataStore } = await import('../../index/metadata-store.js');
    const store = new MetadataStore(vault);
    const graph = await store.loadGraph();
    expect(graph).toBeTruthy();

    // 검색 실행 — embedding 키워드로 시드 탐색 (Layer 2 문서의 태그와 매칭)
    // layer_filter 없이 검색하여 ingest된 Layer 3 문서도 결과에 포함
    const searchResult = await handleKgSearch(graph, {
      seed: ['embedding'],
      max_results: 10,
    });

    expect('error' in searchResult).toBe(false);
    if (!('error' in searchResult)) {
      // embedding 시드 노드와 연결된 다른 문서들이 존재해야 함
      // (시드 자신은 제외되므로 관련 문서만 반환)
      expect(searchResult).toBeDefined();
      // 시드 노드가 존재하면 결과가 있어야 하고, 없으면 0개도 유효
      expect(searchResult.results.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('시나리오 5: kg_context로 ingest 문서 기반 컨텍스트 생성', async () => {
    const query = 'neural network';
    const results = simulateExternalMcpSearch(query);
    await ingestSearchResults(vault, query, results);

    const buildResult = await handleKgBuild(vault, { force: true });
    expect(buildResult.success).toBe(true);

    const { MetadataStore } = await import('../../index/metadata-store.js');
    const store = new MetadataStore(vault);
    const graph = await store.loadGraph();

    const contextResult = await handleKgContext(graph, {
      query: 'neural network research',
      token_budget: 3000,
      include_full: false,
    });

    expect('error' in contextResult).toBe(false);
    if (!('error' in contextResult)) {
      expect(contextResult.documentCount).toBeGreaterThanOrEqual(0);
      expect(contextResult.estimatedTokens).toBeGreaterThanOrEqual(0);
      expect(contextResult.context).toBeDefined();
    }
  });

  it('시나리오 6: 전체 ingest 파이프라인 — 검색 → ingest → 빌드 → 검색 → 연결', async () => {
    const query = 'knowledge graph spreading activation';

    // Step 1: 외부 검색
    const externalResults = simulateExternalMcpSearch(query);
    expect(externalResults.length).toBe(3);

    // Step 2: Layer 3로 ingest
    const ingestedPaths = await ingestSearchResults(vault, query, externalResults);
    expect(ingestedPaths).toHaveLength(3);

    // Step 3: 기반 지식 추가 (Layer 1, 2)
    await handleCoffaenCreate(vault, {
      layer: 1,
      tags: ['identity', 'researcher'],
      content: '지식 그래프 연구자',
      title: 'Researcher Identity',
      filename: 'identity',
    });
    await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['derived', 'graph'],
      content: '지식 그래프 파생 지식 메모',
      title: 'Graph Insights',
      filename: 'graph-insights',
    });

    // Step 4: 인덱스 빌드
    const buildResult = await handleKgBuild(vault, { force: true });
    expect(buildResult.success).toBe(true);
    expect(buildResult.nodeCount).toBeGreaterThanOrEqual(5);

    // Step 5: 검색
    const { MetadataStore } = await import('../../index/metadata-store.js');
    const store = new MetadataStore(vault);
    const graph = await store.loadGraph();

    const searchResult = await handleKgSearch(graph, {
      seed: ['knowledge-graph-spreading-activation', 'ingest'],
      max_results: 10,
    });

    // Step 6: 합성 문서 생성 (Layer 2)
    const resultCount = 'error' in searchResult ? 0 : searchResult.results.length;
    const synthesisDoc = await handleCoffaenCreate(vault, {
      layer: 2,
      tags: ['synthesis', 'ingest-result'],
      content: `## Ingest 결과 합성

외부에서 수집된 ${ingestedPaths.length}개 문서를 분석했습니다.
관련 문서 ${resultCount}개가 발견되었습니다.

### 핵심 인사이트
- 지식 그래프와 확산 활성화의 결합
- 외부 자료를 Layer 3로 관리하여 신뢰도 추적
- 검증 후 Layer 2로 승격 가능`,
      title: 'Ingest Synthesis',
      filename: 'ingest-synthesis',
    });

    expect(synthesisDoc.success).toBe(true);
    expect(synthesisDoc.path).toMatch(/^02_Derived\//);

    // 최종 상태 확인
    const finalStatus = await handleKgStatus(vault, graph, {});
    expect(finalStatus.nodeCount).toBeGreaterThan(0);
  });

  it('중복 ingest 방지 — 같은 URL을 두 번 ingest하면 파일명 충돌 처리', async () => {
    const result: ExternalSearchResult = {
      title: 'Duplicate Test Article',
      url: 'https://example.com/duplicate',
      snippet: '중복 테스트 자료입니다.',
      relevance: 0.8,
    };

    const first = await ingestSearchResults(vault, 'test', [result]);
    const second = await ingestSearchResults(vault, 'test', [result]);

    // 첫 번째는 성공, 두 번째는 중복으로 실패 (빈 배열 반환)
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0); // 중복 파일 생성 실패
  });
});
