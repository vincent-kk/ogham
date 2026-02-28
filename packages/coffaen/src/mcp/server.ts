/**
 * @file server.ts
 * @description coffaen MCP 서버 — 10개 도구 등록 + 라우팅
 *
 * 도구 목록:
 * CRUD 5개: coffaen_create, coffaen_read, coffaen_update, coffaen_delete, coffaen_move
 * 검색 4개: kg_search, kg_navigate, kg_context, kg_status
 * 빌드 1개: kg_build
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { MetadataStore } from '../index/metadata-store.js';
import type { KnowledgeGraph } from '../types/graph.js';
import { VERSION } from '../version.js';

import { toolError, toolResult } from './shared.js';
import { handleCoffaenCreate } from './tools/coffaen-create.js';
import { handleCoffaenDelete } from './tools/coffaen-delete.js';
import { handleCoffaenMove } from './tools/coffaen-move.js';
import { handleCoffaenRead } from './tools/coffaen-read.js';
import { handleCoffaenUpdate } from './tools/coffaen-update.js';
import { handleKgBuild } from './tools/kg-build.js';
import { handleKgContext } from './tools/kg-context.js';
import { handleKgNavigate } from './tools/kg-navigate.js';
import { handleKgSearch } from './tools/kg-search.js';
import { handleKgStatus } from './tools/kg-status.js';

/** vault 경로 (환경 변수 또는 CWD) */
function getVaultPath(): string {
  return process.env['COFFAEN_VAULT_PATH'] ?? process.cwd();
}

/** 그래프 캐시 (서버 생명주기 동안 메모리 보존) */
let cachedGraph: KnowledgeGraph | null = null;
let cacheVaultPath: string | null = null;

async function loadGraphIfNeeded(
  vaultPath: string,
): Promise<KnowledgeGraph | null> {
  if (cachedGraph && cacheVaultPath === vaultPath) return cachedGraph;

  const store = new MetadataStore(vaultPath);
  const graph = await store.loadGraph();
  if (graph) {
    cachedGraph = graph;
    cacheVaultPath = vaultPath;
  }
  return graph;
}

function invalidateCache(): void {
  cachedGraph = null;
  cacheVaultPath = null;
}

/**
 * coffaen MCP 서버를 생성하고 10개 도구를 등록한다.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'coffaen', version: VERSION });

  // ─── coffaen_create ───────────────────────────────────────────────
  server.registerTool(
    'coffaen_create',
    {
      description:
        '새 기억 문서를 지식 트리에 생성합니다. Layer(1-4)와 태그를 지정하면 Frontmatter가 자동 생성됩니다.',
      inputSchema: z.object({
        layer: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe(
            '문서 Layer (1=Core, 2=Derived, 3=External, 4=Action, 5=Context)',
          ),
        tags: z.array(z.string()).min(1).describe('태그 목록 (최소 1개)'),
        content: z.string().describe('문서 내용 (마크다운)'),
        title: z.string().optional().describe('문서 제목 (선택)'),
        filename: z
          .string()
          .optional()
          .describe('파일명 힌트 (선택, 미지정 시 자동 생성)'),
        source: z.string().optional().describe('외부 출처 (Layer 3용)'),
        expires: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('만료일 YYYY-MM-DD (Layer 4용)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleCoffaenCreate(vaultPath, {
          ...args,
          layer: args.layer as 1 | 2 | 3 | 4 | 5,
        });
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── coffaen_read ────────────────────────────────────────────────
  server.registerTool(
    'coffaen_read',
    {
      description:
        '문서를 읽고 Frontmatter + 본문을 반환합니다. include_related=true이면 SA 기반 관련 문서도 포함합니다.',
      inputSchema: z.object({
        path: z.string().describe('문서 경로 (vault 상대 경로)'),
        depth: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('SA 홉 수 (기본 2)'),
        include_related: z
          .boolean()
          .optional()
          .describe('관련 문서 포함 여부 (기본 true)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleCoffaenRead(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── coffaen_update ──────────────────────────────────────────────
  server.registerTool(
    'coffaen_update',
    {
      description:
        '기존 문서를 수정합니다. Frontmatter의 updated 필드가 자동으로 갱신됩니다.',
      inputSchema: z.object({
        path: z.string().describe('문서 경로'),
        content: z
          .string()
          .optional()
          .describe('새 내용 (마크다운, 생략 시 기존 내용 유지)'),
        frontmatter: z
          .object({
            tags: z.array(z.string()).optional(),
            title: z.string().optional(),
            layer: z
              .number()
              .int()
              .min(1)
              .max(5)
              .optional()
              .describe('Layer 변경 (1-5, Layer 위반 수정 시 사용)'),
            confidence: z.number().min(0).max(1).optional(),
            schedule: z.string().optional(),
          })
          .optional()
          .describe('Frontmatter 부분 업데이트 (선택)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleCoffaenUpdate(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── coffaen_delete ──────────────────────────────────────────────
  server.registerTool(
    'coffaen_delete',
    {
      description:
        '문서를 삭제합니다. Layer 1 문서는 삭제 불가. backlink가 있으면 force=true 필요.',
      inputSchema: z.object({
        path: z.string().describe('문서 경로'),
        force: z
          .boolean()
          .optional()
          .describe('backlink 경고 무시 여부 (기본 false)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleCoffaenDelete(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── coffaen_move ────────────────────────────────────────────────
  server.registerTool(
    'coffaen_move',
    {
      description:
        '문서를 다른 Layer로 이동합니다 (전이). Layer 1 문서는 이동 불가.',
      inputSchema: z.object({
        path: z.string().describe('문서 경로'),
        target_layer: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('목표 Layer (1-5)'),
        reason: z.string().optional().describe('전이 사유'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('신뢰도 (Layer 3→2 전이 시)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleCoffaenMove(vaultPath, {
          ...args,
          target_layer: args.target_layer as 1 | 2 | 3 | 4 | 5,
        });
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_search ───────────────────────────────────────────────────
  server.registerTool(
    'kg_search',
    {
      description:
        '시드 노드(경로 또는 키워드)에서 확산 활성화(SA)로 관련 문서를 탐색합니다.',
      inputSchema: z.object({
        seed: z
          .array(z.string())
          .min(1)
          .describe('시드 노드 (경로 또는 키워드)'),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('최대 반환 수 (기본 10)'),
        decay: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('감쇠 인자 (기본 0.7)'),
        threshold: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('발화 임계값 (기본 0.1)'),
        max_hops: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('최대 홉 수 (기본 5)'),
        layer_filter: z
          .array(z.number().int().min(1).max(5))
          .optional()
          .describe('Layer 필터 (1-5)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = await handleKgSearch(graph, {
          ...args,
          layer_filter: args.layer_filter as (1 | 2 | 3 | 4 | 5)[] | undefined,
        });
        if ('error' in result) {
          return { content: [{ type: 'text' as const, text: result.error }] };
        }
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_navigate ─────────────────────────────────────────────────
  server.registerTool(
    'kg_navigate',
    {
      description:
        '특정 노드의 이웃(인/아웃 링크, 부모/자식, 형제)을 조회합니다.',
      inputSchema: z.object({
        path: z.string().describe('대상 노드 경로'),
        include_inbound: z
          .boolean()
          .optional()
          .describe('인바운드 링크 포함 (기본 true)'),
        include_outbound: z
          .boolean()
          .optional()
          .describe('아웃바운드 링크 포함 (기본 true)'),
        include_hierarchy: z
          .boolean()
          .optional()
          .describe('부모/자식/형제 포함 (기본 true)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = await handleKgNavigate(graph, args);
        if ('error' in result) {
          return { content: [{ type: 'text' as const, text: result.error }] };
        }
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_context ──────────────────────────────────────────────────
  server.registerTool(
    'kg_context',
    {
      description:
        '쿼리에 관련된 문서를 토큰 예산 내에서 조립한 컨텍스트 블록을 반환합니다.',
      inputSchema: z.object({
        query: z.string().describe('검색 쿼리'),
        token_budget: z
          .number()
          .int()
          .min(100)
          .max(10000)
          .optional()
          .describe('토큰 예산 (기본 2000)'),
        include_full: z
          .boolean()
          .optional()
          .describe('상위 N개 전문 포함 (기본 false)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = await handleKgContext(graph, args);
        if ('error' in result) {
          return { content: [{ type: 'text' as const, text: result.error }] };
        }
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_status ───────────────────────────────────────────────────
  server.registerTool(
    'kg_status',
    {
      description:
        '인덱스 상태를 조회합니다 (노드 수, 엣지 수, stale 비율, 신선도).',
      inputSchema: z.object({}),
    },
    async (_args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = await handleKgStatus(vaultPath, graph, {});
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_build ────────────────────────────────────────────────────
  server.registerTool(
    'kg_build',
    {
      description:
        '지식 그래프 인덱스를 빌드합니다. force=true이면 전체 재빌드, 기본은 증분 빌드.',
      inputSchema: z.object({
        force: z.boolean().optional().describe('전체 재빌드 여부 (기본 false)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleKgBuild(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

/**
 * MCP 서버를 stdio 트랜스포트로 시작한다.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
