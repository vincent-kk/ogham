import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MCP_TOOL_NAMES } from '../constants/mcpToolNames.js';

// Track registerTool and tool calls across the mock instance
const registeredTools: string[] = [];
let toolCallCount = 0;

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn().mockImplementation(function () {
      return {
        registerTool: vi.fn(function (name: string) {
          registeredTools.push(name);
        }),
        tool: vi.fn(function () {
          toolCallCount++;
          throw new Error(
            'server.tool() should not be called — use registerTool()',
          );
        }),
        connect: vi.fn(),
      };
    }),
  };
});

const EXPECTED_TOOLS = MCP_TOOL_NAMES;

describe('MCP server tool registration', () => {
  beforeEach(() => {
    registeredTools.length = 0;
    toolCallCount = 0;
  });

  it('registers all expected tools via registerTool', async () => {
    const { createServer } = await import('../mcp/server/server.js');
    createServer();
    expect(registeredTools).toHaveLength(EXPECTED_TOOLS.length);
  });

  it('registers exactly the expected tool names', async () => {
    const { createServer } = await import('../mcp/server/server.js');
    createServer();
    const sorted = [...registeredTools].sort();
    expect(sorted).toEqual([...EXPECTED_TOOLS].sort());
  });

  it('never calls server.tool() — only registerTool()', async () => {
    const { createServer } = await import('../mcp/server/server.js');
    createServer();
    expect(toolCallCount).toBe(0);
  });
});
