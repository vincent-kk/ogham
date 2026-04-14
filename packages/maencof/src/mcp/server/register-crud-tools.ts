/**
 * @file register-crud-tools.ts
 * @description Registers 6 CRUD tools: create, capture_insight, read, update, delete, move
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolError, toolResult } from '../shared/index.js';
import {
  captureInsightInputSchema,
  handleCaptureInsight,
} from '../tools/maencof-capture-insight/index.js';
import { handleMaencofCreate } from '../tools/maencof-create/index.js';
import { handleMaencofDelete } from '../tools/maencof-delete/index.js';
import { handleMaencofMove } from '../tools/maencof-move/index.js';
import { handleMaencofRead } from '../tools/maencof-read/index.js';
import { handleMaencofUpdate } from '../tools/maencof-update/index.js';

import { getVaultPath, invalidateCache } from './graph-cache.js';

export function registerCrudTools(server: McpServer): void {
  // ─── create ───────────────────────────────────────────────
  server.registerTool(
    'create',
    {
      description:
        'Creates a new memory document in the knowledge tree. Frontmatter and H1 title are auto-generated — do NOT include them in the content field.',
      inputSchema: z.object({
        layer: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe(
            'Document Layer (1=Core, 2=Derived, 3=External, 4=Action, 5=Context)',
          ),
        tags: z.array(z.string()).min(1).describe('Tag list (at least 1)'),
        content: z
          .string()
          .describe(
            'Document body (markdown). Do NOT include frontmatter (---) or H1 heading — they are auto-generated.',
          ),
        title: z.string().optional().describe('Document title (optional)'),
        filename: z
          .string()
          .optional()
          .describe(
            'Filename hint (optional, auto-generated if omitted). Supports subdirectory paths like "cve/CVE-2025-1234"',
          ),
        source: z.string().optional().describe('External source (for Layer 3)'),
        expires: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Expiry date YYYY-MM-DD (for Layer 4)'),
        sub_layer: z
          .enum(['relational', 'structural', 'topical', 'buffer', 'boundary'])
          .optional()
          .describe(
            'Sub-layer (L3: relational/structural/topical, L5: buffer/boundary)',
          ),
        mentioned_persons: z
          .array(z.string())
          .optional()
          .describe(
            'People mentioned in this document (e.g., ["홍길동", "Alice"])',
          ),
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

  // ─── capture_insight ──────────────────────────────────────
  server.registerTool(
    'capture_insight',
    {
      description:
        'Captures a conversation insight as a knowledge document. Auto-adds auto-insight tag, tracks stats, and handles session capture limits. Use this when you detect a meaningful insight in conversation.',
      inputSchema: captureInsightInputSchema,
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleCaptureInsight(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── read ────────────────────────────────────────────────
  server.registerTool(
    'read',
    {
      description:
        'Reads a document and returns Frontmatter + body. When include_related=true, also includes SA-based related documents.',
      inputSchema: z.object({
        path: z.string().describe('Document path (relative to vault)'),
        depth: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('SA hop count (default 2)'),
        include_related: z
          .boolean()
          .optional()
          .describe('Include related documents (default true)'),
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

  // ─── update ──────────────────────────────────────────────
  server.registerTool(
    'update',
    {
      description:
        'Updates an existing document. The updated field in Frontmatter is automatically refreshed.',
      inputSchema: z.object({
        path: z.string().describe('Document path'),
        content: z
          .string()
          .optional()
          .describe('New content (markdown, preserves existing if omitted)'),
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
              .describe(
                'Layer change (1-5, use when correcting Layer violations)',
              ),
            confidence: z.number().min(0).max(1).optional(),
            schedule: z.string().optional(),
            sub_layer: z
              .enum([
                'relational',
                'structural',
                'topical',
                'buffer',
                'boundary',
              ])
              .optional()
              .describe(
                'Sub-layer (L3: relational/structural/topical, L5: buffer/boundary)',
              ),
          })
          .optional()
          .describe('Partial Frontmatter update (optional)'),
        change_reason: z
          .enum([
            'identity_evolution',
            'error_correction',
            'info_update',
            'consolidation',
            'reinterpretation',
          ])
          .optional()
          .describe(
            'Required for L1. Category: identity_evolution | error_correction | info_update | consolidation | reinterpretation',
          ),
        justification: z
          .string()
          .min(20)
          .optional()
          .describe(
            'Required for L1. Why this Core Identity change is needed (min 20 chars)',
          ),
        confirm_l1: z
          .boolean()
          .optional()
          .describe(
            'Required for L1. Set true to confirm intentional modification',
          ),
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

  // ─── delete ──────────────────────────────────────────────
  server.registerTool(
    'delete',
    {
      description:
        'Deletes a document. Layer 1 documents cannot be deleted. Requires force=true if backlinks exist.',
      inputSchema: z.object({
        path: z.string().describe('Document path'),
        force: z
          .boolean()
          .optional()
          .describe('Ignore backlink warnings (default false)'),
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

  // ─── move ────────────────────────────────────────────────
  server.registerTool(
    'move',
    {
      description:
        'Moves a document to a different Layer (transition). Layer 1 documents cannot be moved.',
      inputSchema: z.object({
        path: z.string().describe('Document path'),
        target_layer: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('Target Layer (1-5)'),
        reason: z.string().optional().describe('Reason for transition'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('Confidence score (for Layer 3→2 transition)'),
        target_sub_layer: z
          .enum(['relational', 'structural', 'topical', 'buffer', 'boundary'])
          .optional()
          .describe(
            'Target sub-layer (L3: relational/structural/topical, L5: buffer/boundary)',
          ),
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
