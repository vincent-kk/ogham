/**
 * @file crud.ts
 * @description Registers 6 CRUD tools via the wrapper organ:
 * 5 mutate (create, capture_insight, update, delete, move) + 1 plain read (read).
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import {
  captureInsightInputSchema,
  handleCaptureInsight,
} from '../../tools/maencofCaptureInsight/index.js';
import { handleMaencofCreate } from '../../tools/maencofCreate/index.js';
import { handleMaencofDelete } from '../../tools/maencofDelete/index.js';
import { handleMaencofMove } from '../../tools/maencofMove/index.js';
import { handleMaencofRead } from '../../tools/maencofRead/index.js';
import { handleMaencofUpdate } from '../../tools/maencofUpdate/index.js';
import { registerMutateTool, registerReadTool } from '../middlewares/index.js';

export function registerCrudTools(server: McpServer): void {
  // ─── create (mutate) ───────────────────────────────────────
  registerMutateTool(
    server,
    McpToolName.CREATE,
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
            'Filename hint (optional, auto-generated if omitted). Supports subdirectory paths like "cve/CVE-2025-1234" (max 2 subdirectory levels, nested under the layer/sub-layer directory)',
          ),
        source: z.string().optional().describe('External source (for Layer 3)'),
        expires: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Expiry date YYYY-MM-DD (for Layer 4 and L5 buffer)'),
        sub_layer: z
          .enum(['relational', 'structural', 'topical', 'buffer', 'boundary'])
          .optional()
          .describe(
            'Sub-layer (L3: relational/structural/topical — default topical; L5: buffer/boundary — default buffer, the unclassified inbox; for boundary MOC/hub documents prefer boundary_create)',
          ),
        mentioned_persons: z
          .array(z.string())
          .optional()
          .describe(
            'People mentioned in this document (e.g., ["홍길동", "Alice"])',
          ),
        gist: z
          .string()
          .optional()
          .describe(
            'One-line summary injected into turn context every turn. Required for Layer 1 (create rejects a gist-less L1); optional for other layers. Single keyword/phrase line; capped to 128 code points in the per-turn view.',
          ),
      }),
    },
    async (vaultPath, args) =>
      handleMaencofCreate(vaultPath, {
        ...args,
        layer: args.layer as 1 | 2 | 3 | 4 | 5,
      }),
    (_args, result) => result.path ?? null,
  );

  // ─── capture_insight (mutate) ──────────────────────────────
  registerMutateTool(
    server,
    McpToolName.CAPTURE_INSIGHT,
    {
      description:
        'Captures a conversation insight as a knowledge document. Auto-adds auto-insight tag, tracks stats, and handles session capture limits. Use this when you detect a meaningful insight in conversation.',
      inputSchema: captureInsightInputSchema,
    },
    async (vaultPath, args) => handleCaptureInsight(vaultPath, args),
    (_args, result) => result.path ?? null,
  );

  // ─── read (plain read) ─────────────────────────────────────
  registerReadTool(
    server,
    McpToolName.READ,
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
    async (vaultPath, args) => handleMaencofRead(vaultPath, args),
    { needsFreshness: false },
  );

  // ─── update (mutate) ───────────────────────────────────────
  registerMutateTool(
    server,
    McpToolName.UPDATE,
    {
      description:
        'Updates an existing maencof document. The target must already contain a frontmatter block — use create for new documents. The updated field in Frontmatter is automatically refreshed.',
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
            gist: z
              .string()
              .optional()
              .describe(
                'One-line Layer 1 gist injected into turn context. Required for Layer 1 (update rejects a modification that leaves the L1 gist-less); optional for other layers. Single keyword/phrase line; capped to 128 code points in the per-turn view.',
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
    async (vaultPath, args) => handleMaencofUpdate(vaultPath, args),
    (args) => args.path,
  );

  // ─── delete (mutate) ───────────────────────────────────────
  registerMutateTool(
    server,
    McpToolName.DELETE,
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
    async (vaultPath, args) => handleMaencofDelete(vaultPath, args),
    (args) => args.path,
  );

  // ─── move (mutate) ─────────────────────────────────────────
  registerMutateTool(
    server,
    McpToolName.MOVE,
    {
      description:
        'Moves a document to a different Layer (transition), sub-layer, or subdirectory. Layer 1 documents cannot be moved.',
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
        target_subdirectory: z
          .string()
          .optional()
          .describe(
            'Subdirectory under the target layer/sub-layer directory, e.g. "projects" (max 2 levels; ".." rejected). For reorganizing within the same sub-layer, pass target_sub_layer together.',
          ),
      }),
    },
    async (vaultPath, args) =>
      handleMaencofMove(vaultPath, {
        ...args,
        target_layer: args.target_layer as 1 | 2 | 3 | 4 | 5,
      }),
    (args, result) => ({
      primary: args.path,
      also: result.success ? result.path : null,
    }),
  );
}
