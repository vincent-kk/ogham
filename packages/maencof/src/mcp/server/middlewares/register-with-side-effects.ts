/**
 * @file register-with-side-effects.ts
 * @description registerMutateTool / registerReadTool wrappers — 핵심 핸들러를
 * stale append, usage-stats, freshness gate, background rebuild trigger와 일원화한다.
 */
import type {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShape, ZodType } from 'zod';

import { toolError, toolResult } from '../../shared/index.js';
import type { KnowledgeGraph } from '../../../types/graph.js';

import { getVaultPath, invalidateCache } from '../graph-cache.js';

import { ensureFreshGraphNonBlocking } from './freshness-guard.js';
import { runMutateSideEffects } from './mutate-side-effects.js';
import { incrementUsageStat } from './usage-stats.js';

export interface ToolMeta {
  description: string;
  inputSchema: ZodRawShape | ZodType<object>;
  title?: string;
}

export type AffectedPath =
  | string
  | null
  | { primary: string | null; also?: string | null };

export type MutateCoreHandler<TArgs, TResult> = (
  vaultPath: string,
  args: TArgs,
) => Promise<TResult>;

export type GetAffectedPath<TArgs, TResult> = (
  args: TArgs,
  result: TResult,
) => AffectedPath;

export type FreshReadHandler<TArgs, TResult> = (
  vaultPath: string,
  args: TArgs,
  graph: KnowledgeGraph | null,
) => Promise<TResult>;

export type PlainReadHandler<TArgs, TResult> = (
  vaultPath: string,
  args: TArgs,
) => Promise<TResult>;

export interface ReadOptionsFresh {
  needsFreshness: true;
}
export interface ReadOptionsPlain {
  needsFreshness: false;
}

/**
 * Mutate 도구 wrapper.
 *
 * - 핸들러 성공(`result.success !== false`) 시 invalidateCache + runMutateSideEffects.
 * - 실패 시에도 usage-stats는 increment.
 */
export function registerMutateTool<TArgs, TResult>(
  server: McpServer,
  name: string,
  meta: ToolMeta,
  handler: MutateCoreHandler<TArgs, TResult>,
  getAffectedPath: GetAffectedPath<TArgs, TResult>,
): RegisteredTool {
  return server.registerTool(name, meta, async (rawArgs: Record<string, unknown>) => {
    const args = rawArgs as TArgs;
    try {
      const vaultPath = getVaultPath();
      const result = await handler(vaultPath, args);

      if (isResultSuccess(result)) {
        invalidateCache();
        const affected = normalizeAffected(getAffectedPath(args, result));
        await runMutateSideEffects(
          vaultPath,
          name,
          affected.primary,
          affected.also,
        );
      } else {
        await incrementUsageStat(vaultPath, name);
      }

      return toolResult(result);
    } catch (error) {
      return toolError(error);
    }
  });
}

/**
 * Read 도구 wrapper.
 *
 * - `needsFreshness: true` → ensureFreshGraphNonBlocking 결과 graph reference를 핸들러에 전달.
 * - `needsFreshness: false` → graph 미접근 (read 자체가 그래프 의존이 없을 때).
 * - 항상 usage-stats increment.
 */
export function registerReadTool<TArgs, TResult>(
  server: McpServer,
  name: string,
  meta: ToolMeta,
  handler: FreshReadHandler<TArgs, TResult>,
  options: ReadOptionsFresh,
): RegisteredTool;
export function registerReadTool<TArgs, TResult>(
  server: McpServer,
  name: string,
  meta: ToolMeta,
  handler: PlainReadHandler<TArgs, TResult>,
  options: ReadOptionsPlain,
): RegisteredTool;
export function registerReadTool<TArgs, TResult>(
  server: McpServer,
  name: string,
  meta: ToolMeta,
  handler:
    | FreshReadHandler<TArgs, TResult>
    | PlainReadHandler<TArgs, TResult>,
  options: ReadOptionsFresh | ReadOptionsPlain,
): RegisteredTool {
  return server.registerTool(name, meta, async (rawArgs: Record<string, unknown>) => {
    const args = rawArgs as TArgs;
    try {
      const vaultPath = getVaultPath();

      let graph: KnowledgeGraph | null = null;
      if (options.needsFreshness) {
        graph = await ensureFreshGraphNonBlocking(vaultPath);
      }

      await incrementUsageStat(vaultPath, name);

      const result = options.needsFreshness
        ? await (handler as FreshReadHandler<TArgs, TResult>)(
            vaultPath,
            args,
            graph,
          )
        : await (handler as PlainReadHandler<TArgs, TResult>)(vaultPath, args);

      return toolResult(result);
    } catch (error) {
      return toolError(error);
    }
  });
}

function isResultSuccess(result: unknown): boolean {
  if (typeof result !== 'object' || result === null) return true;
  if (!('success' in result)) return true;
  return Boolean((result as { success: unknown }).success);
}

function normalizeAffected(affected: AffectedPath): {
  primary: string | null;
  also: string | null | undefined;
} {
  if (typeof affected === 'string' || affected === null) {
    return { primary: affected, also: undefined };
  }
  return { primary: affected.primary, also: affected.also };
}
