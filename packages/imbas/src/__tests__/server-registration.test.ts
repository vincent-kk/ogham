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
  'imbas_ping',
  'imbas_run_create',
  'imbas_run_get',
  'imbas_run_transition',
  'imbas_run_list',
  'imbas_manifest_get',
  'imbas_manifest_save',
  'imbas_manifest_validate',
  'imbas_manifest_plan',
  'imbas_config_get',
  'imbas_config_set',
  'imbas_cache_get',
  'imbas_cache_set',
  'imbas_ast_search',
  'imbas_ast_analyze',
];

describe('MCP server tool registration', () => {
  beforeEach(() => {
    registeredTools.length = 0;
    toolCallCount = 0;
  });

  it('registers all 15 expected tools via registerTool', async () => {
    const { createServer } = await import('../mcp/server.js');
    createServer();
    expect(registeredTools).toHaveLength(EXPECTED_TOOLS.length);
  });

  it('registers exactly the expected tool names', async () => {
    const { createServer } = await import('../mcp/server.js');
    createServer();
    const sorted = [...registeredTools].sort();
    expect(sorted).toEqual([...EXPECTED_TOOLS].sort());
  });

  it('never calls server.tool() — only registerTool()', async () => {
    const { createServer } = await import('../mcp/server.js');
    createServer();
    expect(toolCallCount).toBe(0);
  });
});
