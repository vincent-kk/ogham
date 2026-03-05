/**
 * @file context-cache-manage.ts
 * @description MCP tool — Manage turn context injection cache.
 * Actions: pin, unpin, refresh, list.
 */
import { resolve } from 'node:path';

import { z } from 'zod';

import type { PinnedNode } from '../../hooks/cache-manager.js';
import {
  readPinnedNodes,
  readTurnContext,
  writePinnedNodes,
  writeTurnContext,
} from '../../hooks/cache-manager.js';
import { buildTurnContext } from '../../hooks/turn-context-builder.js';

export const contextCacheManageInputSchema = {
  action: z
    .enum(['pin', 'unpin', 'refresh', 'list'])
    .describe('Cache management action'),
  cwd: z
    .string()
    .optional()
    .describe('Vault root path (defaults to MAENCOF_VAULT_PATH or CWD)'),
  node_id: z.string().optional().describe('Node ID (required for pin/unpin)'),
  node_title: z.string().optional().describe('Node title (required for pin)'),
  node_layer: z
    .number()
    .optional()
    .describe('Node layer 1-5 (required for pin)'),
};

const MAX_PINNED = 20;

function resolveVaultPath(cwd?: string): string {
  const raw = cwd ?? process.env['MAENCOF_VAULT_PATH'] ?? process.cwd();
  return resolve(raw);
}

export async function handleContextCacheManage(
  vaultPath: string,
  input: {
    action: string;
    cwd?: string;
    node_id?: string;
    node_title?: string;
    node_layer?: number;
  },
): Promise<{
  success: boolean;
  [key: string]: unknown;
}> {
  const vault = resolveVaultPath(input.cwd ?? vaultPath);

  switch (input.action) {
    case 'pin': {
      if (!input.node_id || !input.node_title || input.node_layer == null) {
        return {
          success: false,
          error: 'pin requires node_id, node_title, and node_layer',
        };
      }
      const nodes = readPinnedNodes(vault);

      // Deduplicate by node_id
      const existing = nodes.find((n) => n.id === input.node_id);
      if (existing) {
        return {
          success: true,
          message: `Node "${input.node_id}" is already pinned`,
          totalPinned: nodes.length,
        };
      }

      const newNode: PinnedNode = {
        id: input.node_id,
        title: input.node_title,
        layer: input.node_layer,
        pinnedAt: new Date().toISOString(),
      };

      nodes.push(newNode);

      // Enforce max — evict oldest
      let toWrite = nodes;
      if (toWrite.length > MAX_PINNED) {
        toWrite = [...toWrite]
          .sort(
            (a, b) =>
              new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime(),
          )
          .slice(0, MAX_PINNED);
      }

      writePinnedNodes(vault, toWrite);

      // Rebuild turn context with new pin
      const turnContext = buildTurnContext(vault);
      writeTurnContext(vault, turnContext);

      return {
        success: true,
        pinned: true,
        totalPinned: toWrite.length,
        turnContext,
      };
    }

    case 'unpin': {
      if (!input.node_id) {
        return { success: false, error: 'unpin requires node_id' };
      }
      const nodes = readPinnedNodes(vault);
      const idx = nodes.findIndex((n) => n.id === input.node_id);
      if (idx === -1) {
        return {
          success: true,
          unpinned: false,
          reason: `Node "${input.node_id}" not found in pinned nodes`,
          totalPinned: nodes.length,
        };
      }

      nodes.splice(idx, 1);
      writePinnedNodes(vault, nodes);

      // Rebuild turn context without the unpinned node
      const turnContext = buildTurnContext(vault);
      writeTurnContext(vault, turnContext);

      return {
        success: true,
        unpinned: true,
        totalPinned: nodes.length,
      };
    }

    case 'refresh': {
      const turnContext = buildTurnContext(vault);
      writeTurnContext(vault, turnContext);
      return { success: true, refreshed: true, turnContext };
    }

    case 'list': {
      const pinnedNodes = readPinnedNodes(vault);
      const turnContext = readTurnContext(vault) ?? '(no cached turn context)';
      return {
        success: true,
        pinnedNodes,
        turnContext,
      };
    }

    default:
      return {
        success: false,
        error: `Unknown action: ${input.action}. Valid actions: pin, unpin, refresh, list`,
      };
  }
}
