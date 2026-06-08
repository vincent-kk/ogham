import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { EnableFlags } from '@/config/index.js';
import {
  listSubtitleLanguagesTool,
  subtitlesTool,
  transcriptTool,
} from '@/features/index.js';

import { chaptersTool } from '../tools/chapters.js';
import { commentsSummaryTool } from '../tools/comments-summary.js';
import { commentsTool } from '../tools/comments.js';
import { downloadAudioTool } from '../tools/download-audio.js';
import { downloadVideoTool } from '../tools/download-video.js';
import { heatmapTool } from '../tools/heatmap.js';
import { metadataSummaryTool } from '../tools/metadata-summary.js';
import { metadataTool } from '../tools/metadata.js';
import { playlistTool } from '../tools/playlist.js';
import { searchVideosTool } from '../tools/search.js';
import { thumbnailTool } from '../tools/thumbnail.js';
import type {
  ToolDefinition,
  ToolDeps,
} from '../tools/utils/tool-definition.js';

/**
 * Every tool the server knows about (ARCHITECTURE §7 order). Boot registers each
 * one only when its enable flag is on (ADR-8). This array order is the tools/list
 * order.
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
  searchVideosTool,
  listSubtitleLanguagesTool,
  transcriptTool,
  metadataTool,
  subtitlesTool,
  metadataSummaryTool,
  commentsTool,
  commentsSummaryTool,
  chaptersTool,
  heatmapTool,
  thumbnailTool,
  downloadVideoTool,
  downloadAudioTool,
  playlistTool,
];

/** Pure gate check (ADR-8): a tool registers only when its enable flag is on. */
export function isToolEnabled(
  tool: ToolDefinition,
  enable: EnableFlags,
): boolean {
  return enable[tool.enabledBy];
}

export function registerEnabledTools(
  server: McpServer,
  deps: ToolDeps,
): string[] {
  const registered: string[] = [];
  for (const tool of TOOL_REGISTRY) {
    if (isToolEnabled(tool, deps.config.enable)) {
      tool.register(server, deps);
      registered.push(tool.name);
    }
  }
  deps.logger.info({ tools: registered }, 'registered MCP tools');
  return registered;
}
