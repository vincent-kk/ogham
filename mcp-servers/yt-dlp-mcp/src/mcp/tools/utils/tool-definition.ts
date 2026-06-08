import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { Config } from '@/config/index.js';
import type { EnableKey } from '@/constants/tool-defaults.js';
import type { Service } from '@/core/service.js';
import type { Logger } from '@/obs/logger.js';

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
