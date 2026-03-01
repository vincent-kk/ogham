/**
 * @file server.ts
 * @description maencof MCP 서버 — 14개 도구 등록 + 라우팅
 *
 * 도구 목록:
 * CRUD 5개: maencof_create, maencof_read, maencof_update, maencof_delete, maencof_move
 * 검색 5개: kg_search, kg_navigate, kg_context, kg_status, kg_suggest_links
 * 빌드 1개: kg_build
 * CLAUDE.md 3개: claudemd_merge, claudemd_read, claudemd_remove
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { z } from 'zod';

import { MetadataStore } from '../index/metadata-store.js';
import type { KnowledgeGraph } from '../types/graph.js';
import { VERSION } from '../version.js';

import { toolError, toolResult } from './shared.js';
import { handleClaudeMdMerge } from './tools/claudemd-merge.js';
import { handleClaudeMdRead } from './tools/claudemd-read.js';
import { handleClaudeMdRemove } from './tools/claudemd-remove.js';
import { handleKgBuild } from './tools/kg-build.js';
import { handleKgContext } from './tools/kg-context.js';
import { handleKgNavigate } from './tools/kg-navigate.js';
import { handleKgSearch } from './tools/kg-search.js';
import { handleKgStatus } from './tools/kg-status.js';
import { handleKgSuggestLinks } from './tools/kg-suggest-links.js';
import { handleMaencofCreate } from './tools/maencof-create.js';
import { handleMaencofDelete } from './tools/maencof-delete.js';
import { handleMaencofMove } from './tools/maencof-move.js';
import { handleMaencofRead } from './tools/maencof-read.js';
import { handleMaencofUpdate } from './tools/maencof-update.js';

/** 전역 경로 접근 차단 접두사 */
const BLOCKED_PREFIXES = [
  resolve(homedir(), '.claude'),
  resolve(homedir(), '.config'),
];

/**
 * vault 경로 (환경 변수 또는 CWD).
 * 전역 설정 경로로의 접근을 차단한다.
 */
function getVaultPath(): string {
  const raw = process.env['MAENCOF_VAULT_PATH'] ?? process.cwd();
  const resolved = resolve(raw);

  // 전역 설정 경로 접근 차단
  for (const prefix of BLOCKED_PREFIXES) {
    if (resolved.startsWith(prefix)) {
      throw new Error(
        `전역 설정 경로에 대한 접근이 차단되었습니다: ${resolved}`,
      );
    }
  }

  return resolved;
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
 * maencof MCP 서버를 생성하고 14개 도구를 등록한다.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'maencof', version: VERSION });
  registerCrudTools(server);
  registerKgTools(server);
  registerClaudeMdTools(server);
  return server;
}

/**
 * CRUD 5개 도구를 등록한다: maencof_create, maencof_read, maencof_update, maencof_delete, maencof_move
 */
function registerCrudTools(server: McpServer): void {
  // ─── maencof_create ───────────────────────────────────────────────
  server.registerTool(
    'maencof_create',
    {
      description:
        '새 기억 문서를 지식 트리에 생성합니다. Layer(1-5)와 태그를 지정하면 Frontmatter가 자동 생성됩니다.',
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
        const result = await handleMaencofCreate(vaultPath, {
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

  // ─── maencof_read ────────────────────────────────────────────────
  server.registerTool(
    'maencof_read',
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
        const result = await handleMaencofRead(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── maencof_update ──────────────────────────────────────────────
  server.registerTool(
    'maencof_update',
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
        const result = await handleMaencofUpdate(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── maencof_delete ──────────────────────────────────────────────
  server.registerTool(
    'maencof_delete',
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
        const result = await handleMaencofDelete(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── maencof_move ────────────────────────────────────────────────
  server.registerTool(
    'maencof_move',
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
        const result = await handleMaencofMove(vaultPath, {
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
}

/**
 * KG 5개 도구를 등록한다: kg_search, kg_navigate, kg_context, kg_status, kg_build
 */
function registerKgTools(server: McpServer): void {
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

  // ─── kg_suggest_links ─────────────────────────────────────────────
  server.registerTool(
    'kg_suggest_links',
    {
      description:
        '대상 문서에 대해 기존 지식 베이스 내 관련 문서 연결 후보를 추천합니다. 태그 Jaccard 유사도 + SA 보강 2단계 알고리즘.',
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe('대상 문서 경로 (기존 문서)'),
        tags: z
          .array(z.string())
          .optional()
          .describe('새 문서의 태그 목록'),
        content_hint: z
          .string()
          .optional()
          .describe('새 문서 내용 일부 (키워드 추출)'),
        max_suggestions: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('최대 추천 수 (기본 5)'),
        min_score: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('최소 유사도 임계값 (기본 0.2)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = handleKgSuggestLinks(graph, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

/**
 * CLAUDE.md 조작 3개 도구를 등록한다: claudemd_merge, claudemd_read, claudemd_remove
 */
function registerClaudeMdTools(server: McpServer): void {
  // ─── claudemd_merge ───────────────────────────────────────────────
  server.registerTool(
    'claudemd_merge',
    {
      description:
        'CWD의 CLAUDE.md에 maencof 지시문 섹션을 삽입하거나 업데이트합니다. 마커(MAENCOF:START/END) 기반 섹션 관리.',
      inputSchema: z.object({
        content: z
          .string()
          .describe('CLAUDE.md에 삽입할 maencof 지시문 (마크다운)'),
        dry_run: z
          .boolean()
          .optional()
          .describe('드라이런 모드 (기본 false)'),
      }),
    },
    (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdMerge(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── claudemd_read ────────────────────────────────────────────────
  server.registerTool(
    'claudemd_read',
    {
      description:
        'CWD의 CLAUDE.md에서 maencof 지시문 섹션을 읽습니다.',
      inputSchema: z.object({}),
    },
    (_args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdRead(vaultPath);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── claudemd_remove ──────────────────────────────────────────────
  server.registerTool(
    'claudemd_remove',
    {
      description:
        'CWD의 CLAUDE.md에서 maencof 지시문 섹션을 제거합니다.',
      inputSchema: z.object({
        dry_run: z
          .boolean()
          .optional()
          .describe('드라이런 모드 (기본 false)'),
      }),
    },
    (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdRemove(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

/**
 * MCP 서버를 stdio 트랜스포트로 시작한다.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
