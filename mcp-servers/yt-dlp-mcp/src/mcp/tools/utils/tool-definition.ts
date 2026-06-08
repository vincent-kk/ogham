import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { Config } from '@/config/index.js';
import type { Service } from '@/core/service.js';
import type { Logger } from '@/obs/logger.js';

/** Registration gate. 'default' tools are always on; the rest require their flag. */
export type EnableKey =
  | 'default'
  | 'subtitles'
  | 'metadataSummary'
  | 'comments'
  | 'commentsSummary'
  | 'chapters'
  | 'heatmap'
  | 'thumbnail'
  | 'download'
  | 'playlist';

export interface ToolDeps {
  service: Service;
  config: Config;
  logger: Logger;
}

export interface ToolDefinition {
  name: string;
  enabledBy: EnableKey;
  register(server: McpServer, deps: ToolDeps): void;
}
