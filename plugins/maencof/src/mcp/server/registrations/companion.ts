/**
 * @file companion.ts
 * @description Registers the companion_edit tool.
 *
 * companion-identity.json은 KG 그래프 캐시와 무관하고 preview 경로는 순수해야
 * 하므로(캐시 무효화 금지) mutate 래퍼 대신 `registerReadTool`을 재사용한다 —
 * vaultPath 해석 + usage-stat + 에러 처리만 취하고 KG 캐시는 건드리지 않는다.
 * 실제 파일 쓰기는 commit일 때만 핸들러(core/companionEdit) 내부에서 수행한다.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import { handleCompanionEdit } from '../../tools/companionEdit/index.js';
import { registerReadTool } from '../middlewares/index.js';

export function registerCompanionTools(server: McpServer): void {
  registerReadTool(
    server,
    McpToolName.COMPANION_EDIT,
    {
      description:
        'Edits .maencof-meta/companion-identity.json (canonical schema), the single source of truth for the AI companion persona. Two-step by design: without commit it previews the diff and validation only (file unchanged); with commit:true it backs up then writes. Rejects changes that break the schema, exceed the 500-char per-turn injection budget, or whose brief is not shorter than its detail. This is the ONLY permitted channel to edit companion-identity.json — never edit it directly.',
      inputSchema: z.object({
        operation: z
          .enum([
            'add_section',
            'update_section',
            'remove_section',
            'update_core',
          ])
          .describe(
            'add_section: append a new persona axis; update_section: patch an existing section by key; remove_section: delete a section by key; update_core: change name/greeting (role is a section — edit it via update_section)',
          ),
        key: z
          .string()
          .min(1)
          .optional()
          .describe('Target section key for update_section / remove_section'),
        section: z
          .object({
            key: z
              .string()
              .min(1)
              .optional()
              .describe(
                'Section key (required for add_section; immutable on update)',
              ),
            inject: z
              .enum(['session', 'turn', 'both'])
              .optional()
              .describe(
                'Injection channel: session (session-start only), turn (every turn), both',
              ),
            salience: z
              .number()
              .int()
              .min(1)
              .max(5)
              .optional()
              .describe(
                '1-5; placement order within the tag (5 = first). Not a runtime cut.',
              ),
            detail: z
              .string()
              .min(1)
              .optional()
              .describe(
                'Canonical text; always used at session start, and per-turn when brief is absent',
              ),
            brief: z
              .string()
              .min(1)
              .optional()
              .describe(
                'Optional per-turn compression of detail (must be shorter than detail)',
              ),
            title: z
              .string()
              .min(1)
              .optional()
              .describe('Optional human-readable label'),
          })
          .optional()
          .describe('Section body for add_section / update_section'),
        core: z
          .object({
            name: z.string().min(1).optional(),
            greeting: z.string().min(1).optional(),
          })
          .optional()
          .describe('Core field patch for update_core'),
        commit: z
          .boolean()
          .optional()
          .describe('false (default) = preview only; true = back up and write'),
      }),
    },
    async (vaultPath, args) => handleCompanionEdit(vaultPath, args),
    { needsFreshness: false },
  );
}
