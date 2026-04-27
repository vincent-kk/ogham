/**
 * @file cache.ts
 * @description Registers the context_cache_manage plain-read tool.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  contextCacheManageInputSchema,
  handleContextCacheManage,
} from '../../tools/context-cache-manage/index.js';

import { registerReadTool } from '../middlewares/index.js';

export function registerCacheTools(server: McpServer): void {
  registerReadTool(
    server,
    'context_cache_manage',
    {
      description:
        'Manage the turn context injection cache. Pin/unpin nodes for persistent inclusion in turn context, force-refresh the cache, or list current cache state.',
      inputSchema: z.object(contextCacheManageInputSchema),
    },
    async (vaultPath, args) => handleContextCacheManage(vaultPath, args),
    { needsFreshness: false },
  );
}
