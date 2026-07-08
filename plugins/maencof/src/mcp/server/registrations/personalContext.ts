/**
 * @file personalContext.ts
 * @description Registers the capture_personal_context tool.
 *
 * personal-context.json은 KG 그래프 캐시와 무관하므로 companion_edit과 같은 근거로
 * `registerReadTool({ needsFreshness: false })`을 재사용한다 — vaultPath 해석 +
 * usage-stat + 에러 처리만 취하고 KG 캐시는 건드리지 않는다.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import {
  handlePersonalContextCapture,
  personalContextCaptureInputSchema,
} from '../../tools/personalContextCapture/index.js';
import { registerReadTool } from '../middlewares/index.js';

export function registerPersonalContextTools(server: McpServer): void {
  registerReadTool(
    server,
    McpToolName.PERSONAL_CONTEXT_CAPTURE,
    {
      description:
        'Silently upserts or resolves an entry in the personal context (.maencof-meta/personal-context.json): transient user states and recent personal topics that the companion weaves into conversation as subtle care. Same-label recapture reinforces the state / touches the topic instead of duplicating. Quiet by design — never announce captures to the user. States expire (default 14d) unless reinforced; topics rotate (keep 20). This is the ONLY permitted channel to edit states/topics entries — never edit the file directly.',
      inputSchema: personalContextCaptureInputSchema,
    },
    async (vaultPath, args) => handlePersonalContextCapture(vaultPath, args),
    { needsFreshness: false },
  );
}
