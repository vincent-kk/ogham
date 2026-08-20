/**
 * @file crud.ts
 * @description Registers 6 CRUD tools via the wrapper organ:
 * 5 mutate (create, capture_insight, update, delete, move) + 1 plain read (read).
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { McpToolName } from '../../../../constants/mcpToolNames.js';
import {
  BufferTypeSchema,
  DomainTypeSchema,
  HubKindSchema,
  IsoDateSchema,
  MaturitySchema,
  MembershipStatusSchema,
  OrgTypeSchema,
  PromotionTargetSchema,
  SubLayerSchema,
} from '../../../../types/frontmatter.js';
import {
  captureInsightInputSchema,
  handleCaptureInsight,
} from '../../../tools/maencofCaptureInsight/index.js';
import { handleMaencofCreate } from '../../../tools/maencofCreate/index.js';
import { handleMaencofDelete } from '../../../tools/maencofDelete/index.js';
import { handleMaencofMove } from '../../../tools/maencofMove/index.js';
import { handleMaencofRead } from '../../../tools/maencofRead/index.js';
import { handleMaencofUpdate } from '../../../tools/maencofUpdate/index.js';
import {
  registerMutateTool,
  registerReadTool,
} from '../../middlewares/index.js';

/**
 * update 의 frontmatter 하위 스키마 — 키 집합은 핸들러의 FM_FIELD_SERIALIZERS
 * ∪ {hub, unset} 와 일치해야 하며 updateSchemaSurfaceSync spec 이 고정한다.
 * 값 집합은 전부 types/frontmatter.ts 정본에서 파생한다.
 */
export const updateFrontmatterInputSchema = z.object({
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
  layer: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('Layer change (1-5, use when correcting Layer violations)'),
  confidence: z.number().min(0).max(1).optional(),
  schedule: z.string().optional(),
  cluster_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Thread/cluster declaration — documents sharing a cluster_key collapse to one representative in kg_search/kg_context. Remove with unset.',
    ),
  sub_layer: SubLayerSchema.optional().describe(
    'Sub-layer for Layer 3 only (relational/structural/topical/clusterseed — clusterseed = cluster anchor, ranked only when directly seeded).',
  ),
  gist: z
    .string()
    .optional()
    .describe(
      'One-line Layer 1 gist injected into turn context. Required for Layer 1 (update rejects a modification that leaves the L1 gist-less); optional for other layers. Single keyword/phrase line; capped to 128 code points in the per-turn view.',
    ),
  hub: z
    .boolean()
    .optional()
    .describe(
      'Promote or demote this document as a cross-layer hub (MOC). Requires purpose when true; rejected on Layer 5.',
    ),
  hub_kind: HubKindSchema.optional().describe(
    'Hub document kind. Only valid together with hub=true.',
  ),
  purpose: z
    .string()
    .optional()
    .describe(
      'One line stating what this hub integrates. Required when hub=true.',
    ),
  source: z
    .string()
    .optional()
    .describe('External source reference (typically Layer 3).'),
  expires: IsoDateSchema.optional().describe(
    'Expiry date YYYY-MM-DD (Layer 4 and L5 buffer).',
  ),
  mentioned_persons: z
    .array(z.string())
    .optional()
    .describe('People mentioned in this document (all layers).'),
  domain: z
    .string()
    .optional()
    .describe('Domain name for cross-layer grouping.'),
  domain_type: DomainTypeSchema.optional().describe(
    'Domain kind (life/professional).',
  ),
  person_ref: z
    .string()
    .optional()
    .describe('Person reference key (L3A relational only).'),
  trust_level: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Trust level 0.0-1.0 (L3A relational).'),
  expertise_domains: z
    .array(z.string())
    .optional()
    .describe('Expertise domain list (L3A relational).'),
  org_type: OrgTypeSchema.optional().describe(
    'Organization kind (L3B structural only).',
  ),
  membership_status: MembershipStatusSchema.optional().describe(
    'Membership status (L3B structural).',
  ),
  ba_context: z
    .string()
    .optional()
    .describe('Ba context description (L3B structural).'),
  topic_category: z
    .string()
    .optional()
    .describe('Topic category (L3C topical).'),
  maturity: MaturitySchema.optional().describe('Topic maturity (L3C topical).'),
  buffer_type: BufferTypeSchema.optional().describe(
    'Layer 5 only. What kind of unclassified item this is.',
  ),
  promotion_target: PromotionTargetSchema.optional().describe(
    'Layer 5 only. Suggested destination when promoted (sub-layer name or L2).',
  ),
  source_context: z
    .string()
    .optional()
    .describe('Layer 5 only. Where this item came from.'),
  unset: z
    .array(z.string())
    .optional()
    .describe(
      'Remove these frontmatter fields. Use this to recover a document whose frontmatter fails validation. Protected fields (created, updated, layer, tags) are rejected; blocked entirely on Layer 1.',
    ),
});

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
            'Filename hint (optional, auto-generated if omitted). Supports subdirectory paths like "cve/CVE-2025-1234" (max 2 subdirectory levels, nested under the layer/sub-layer directory). Layers 1 and 5 are flat — subdirectory prefixes are rejected there.',
          ),
        source: z.string().optional().describe('External source (for Layer 3)'),
        expires: IsoDateSchema.optional().describe(
          'Expiry date YYYY-MM-DD (for Layer 4 and L5 buffer)',
        ),
        cluster_key: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Thread/cluster declaration for incremental records (e.g. "jira-gcc-3903", "works-mail-2026-08-19"). Documents sharing a cluster_key collapse to one representative in kg_search/kg_context; open the full cluster via kg_search { cluster }. Remove with frontmatter.unset.',
          ),
        sub_layer: SubLayerSchema.optional().describe(
          'Sub-layer for Layer 3 only (relational/structural/topical/clusterseed — default topical; clusterseed = cluster anchor, ranked only when directly seeded). Layer 5 is a flat unclassified buffer and takes no sub-layer.',
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
        hub: z
          .boolean()
          .optional()
          .describe(
            'Mark this document as a cross-layer hub (MOC). Hubs are orthogonal to layers — any Layer 1-4 document can be one. Requires purpose. Rejected on Layer 5.',
          ),
        hub_kind: HubKindSchema.optional().describe(
          'Hub document kind. Only valid together with hub=true.',
        ),
        purpose: z
          .string()
          .optional()
          .describe(
            'One line stating what this hub integrates. Required when hub=true — it is what kg_context reports without opening the body.',
          ),
        buffer_type: BufferTypeSchema.optional().describe(
          'Layer 5 only. What kind of unclassified item this is.',
        ),
        promotion_target: PromotionTargetSchema.optional().describe(
          'Layer 5 only. Suggested destination when this item is promoted.',
        ),
        source_context: z
          .string()
          .optional()
          .describe(
            'Layer 5 only. Where this item came from (e.g. "대화 중 멘션", "웹 스크랩").',
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
        'Reads a document and returns Frontmatter + body. For related documents use kg_search or kg_context.',
      inputSchema: z.object({
        path: z.string().describe('Document path (relative to vault)'),
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
        'Updates an existing maencof document: body content and/or frontmatter metadata. frontmatter patches any editable field (tags, title, layer, source, expires, domain/person/org/topic fields, L5 buffer fields, hub, gist, ...); unset removes fields. The target must already contain a frontmatter block — use create for new documents. The updated field is refreshed automatically.',
      inputSchema: z.object({
        path: z.string().describe('Document path'),
        content: z
          .string()
          .optional()
          .describe('New content (markdown, preserves existing if omitted)'),
        frontmatter: updateFrontmatterInputSchema
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
        target_sub_layer: SubLayerSchema.optional().describe(
          'Target sub-layer for Layer 3 only (relational/structural/topical/clusterseed).',
        ),
        target_subdirectory: z
          .string()
          .optional()
          .describe(
            'Subdirectory under the target layer/sub-layer directory, e.g. "projects" (max 2 levels; ".." rejected). Layers 1 and 5 are flat — rejected there. For reorganizing within the same sub-layer, pass target_sub_layer together.',
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
