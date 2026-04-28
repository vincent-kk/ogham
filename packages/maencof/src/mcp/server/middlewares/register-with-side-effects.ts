/**
 * @file register-with-side-effects.ts
 * @description registerMutateTool / registerReadTool wrappers — 핵심 핸들러를
 * stale append, usage-stats, freshness gate, background rebuild trigger와 일원화한다.
 */
import type {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

import type { KnowledgeGraph } from '../../../types/graph.js';
import { toolError, toolResult } from '../../shared/index.js';
import { getVaultPath, invalidateCache } from '../graph-cache/index.js';

import { ensureFreshGraphNonBlocking } from './freshness-guard.js';
import { runMutateSideEffects } from './mutate-side-effects.js';
import { incrementUsageStat } from './usage-stats.js';

export interface ToolMeta<TShape extends ZodRawShape> {
  description: string;
  inputSchema: ZodObject<TShape>;
  title?: string;
}

export type AffectedPath =
  | string
  | null
  | { primary: string | null; also?: string | null };

export type GetAffectedPath<TArgs, TResult> = (
  args: TArgs,
  result: TResult,
) => AffectedPath;

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
export function registerMutateTool<TShape extends ZodRawShape, TResult>(
  server: McpServer,
  name: string,
  meta: ToolMeta<TShape>,
  handler: (
    vaultPath: string,
    args: z.infer<ZodObject<TShape>>,
  ) => Promise<TResult>,
  getAffectedPath: GetAffectedPath<z.infer<ZodObject<TShape>>, TResult>,
): RegisteredTool {
  return server.registerTool(
    name,
    meta,
    async (rawArgs: Record<string, unknown>) => {
      const args = rawArgs as z.infer<ZodObject<TShape>>;
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
    },
  );
}

/**
 * Read 도구 wrapper.
 *
 * - `needsFreshness: true` → ensureFreshGraphNonBlocking 결과 graph reference를 핸들러에 전달.
 * - `needsFreshness: false` → graph 미접근. 핸들러가 필요하면 loadGraphIfNeeded를 직접 호출 (e.g. kg_status).
 * - 항상 usage-stats increment.
 */
export function registerReadTool<TShape extends ZodRawShape, TResult>(
  server: McpServer,
  name: string,
  meta: ToolMeta<TShape>,
  handler: (
    vaultPath: string,
    args: z.infer<ZodObject<TShape>>,
    graph: KnowledgeGraph | null,
  ) => Promise<TResult>,
  options: ReadOptionsFresh,
): RegisteredTool;
export function registerReadTool<TShape extends ZodRawShape, TResult>(
  server: McpServer,
  name: string,
  meta: ToolMeta<TShape>,
  handler: (
    vaultPath: string,
    args: z.infer<ZodObject<TShape>>,
  ) => Promise<TResult>,
  options: ReadOptionsPlain,
): RegisteredTool;
export function registerReadTool<TShape extends ZodRawShape, TResult>(
  server: McpServer,
  name: string,
  meta: ToolMeta<TShape>,
  handler:
    | ((
        vaultPath: string,
        args: z.infer<ZodObject<TShape>>,
        graph: KnowledgeGraph | null,
      ) => Promise<TResult>)
    | ((
        vaultPath: string,
        args: z.infer<ZodObject<TShape>>,
      ) => Promise<TResult>),
  options: ReadOptionsFresh | ReadOptionsPlain,
): RegisteredTool {
  return server.registerTool(
    name,
    meta,
    async (rawArgs: Record<string, unknown>) => {
      const args = rawArgs as z.infer<ZodObject<TShape>>;
      try {
        const vaultPath = getVaultPath();

        let graph: KnowledgeGraph | null = null;
        if (options.needsFreshness)
          graph = await ensureFreshGraphNonBlocking(vaultPath);

        await incrementUsageStat(vaultPath, name);

        const result = options.needsFreshness
          ? await (
              handler as (
                vp: string,
                a: z.infer<ZodObject<TShape>>,
                g: KnowledgeGraph | null,
              ) => Promise<TResult>
            )(vaultPath, args, graph)
          : await (
              handler as (
                vp: string,
                a: z.infer<ZodObject<TShape>>,
              ) => Promise<TResult>
            )(vaultPath, args);

        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
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
  if (typeof affected === 'string' || affected === null)
    return { primary: affected, also: undefined };
  return { primary: affected.primary, also: affected.also };
}
