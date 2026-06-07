import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { EnableFlags } from '../config.js';
import type { ToolDefinition, ToolDeps } from './tool-definition.js';
import { chaptersTool } from './tools/chapters.js';
import { commentsTool } from './tools/comments.js';
import { commentsSummaryTool } from './tools/comments-summary.js';
import { downloadAudioTool } from './tools/download-audio.js';
import { downloadVideoTool } from './tools/download-video.js';
import { heatmapTool } from './tools/heatmap.js';
import { listSubtitleLanguagesTool } from './tools/list-subtitle-languages.js';
import { metadataTool } from './tools/metadata.js';
import { metadataSummaryTool } from './tools/metadata-summary.js';
import { playlistTool } from './tools/playlist.js';
import { searchVideosTool } from './tools/search.js';
import { subtitlesTool } from './tools/subtitles.js';
import { thumbnailTool } from './tools/thumbnail.js';
import { transcriptTool } from './tools/transcript.js';

/**
 * Every tool the server knows about (ARCHITECTURE §7 order). Boot registers each
 * one only if its gate is 'default' or its config flag is on (ADR-8). This array
 * order is the tools/list order.
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

/** Pure gate check (ADR-8): default tools are always on; others follow their flag. */
export function isToolEnabled(tool: ToolDefinition, enable: EnableFlags): boolean {
  if (tool.enabledBy === 'default') {
    return true;
  }
  return enable[tool.enabledBy];
}

export function registerEnabledTools(server: McpServer, deps: ToolDeps): string[] {
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
