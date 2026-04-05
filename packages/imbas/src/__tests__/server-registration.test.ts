import { describe, it, expect, vi, beforeEach } from 'vitest';

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
          throw new Error('server.tool() should not be called — use registerTool()');
        }),
        connect: vi.fn(),
      };
    }),
  };
});

const EXPECTED_TOOLS = [
  'ping',
  'run_create',
  'run_get',
  'run_transition',
  'run_list',
  'manifest_get',
  'manifest_save',
  'manifest_validate',
  'manifest_plan',
  'config_get',
  'config_set',
  'cache_get',
  'cache_set',
  'ast_search',
  'ast_analyze',
];

describe('MCP server tool registration', () => {
  beforeEach(() => {
    registeredTools.length = 0;
    toolCallCount = 0;
  });

  it('registers all 15 expected tools via registerTool', async () => {
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
