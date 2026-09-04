import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { STRUCTURE_VALIDATION_MODES } from '../../constants/mcpContracts.js';
import { MCP_TOOL_NAMES, McpToolName } from '../../constants/mcpToolNames.js';
import { TOOL_INPUT_DIAGNOSTIC_CODE } from '../../constants/toolEnvelope.js';
import { createServer } from '../../mcp/server/lifecycle/createServer.js';

const EXPECTED_TOOL_NAMES = [
  'project_init',
  'rule_docs_sync',
  'open_settings',
  'fractal_scan',
  'context_resolve',
  'restructure_plan',
  'structure_validate',
  'verification_scan',
  'review_state',
] as const;

const REMOVED_TOOL_NAMES = [
  'ast_analyze',
  'fractal_navigate',
  'doc_compress',
  'test_metrics',
  'drift_detect',
  'lca_resolve',
  'rule_query',
  'review_manage',
  'debt_manage',
  'cache_manage',
  'ast_grep_search',
  'ast_grep_replace',
  'config_patch_validate',
  'coverage_verify',
] as const;

const PROJECT_INIT_INPUT = {
  path: '/project',
  adapterIds: ['ecmascript'],
};
const INVALID_PROJECT_INIT_INPUT = {
  ...PROJECT_INIT_INPUT,
  adapterIds: [],
};
const MCP_TEST_CLIENT_INFO = {
  name: 'filid-tool-surface-test',
  version: '0.0.0',
};

interface ConnectedTestClient {
  client: Client;
  close: () => Promise<void>;
}

function collectRegisteredToolNames(): string[] {
  const registerTool = vi.spyOn(McpServer.prototype, 'registerTool');
  createServer();
  return registerTool.mock.calls.map(([name]) => name);
}

async function connectTestClient(): Promise<ConnectedTestClient> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client(MCP_TEST_CLIENT_INFO);
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Filid 1.0 MCP tool surface', () => {
  it('registers exactly the nine independently specified tool names', () => {
    const registered = collectRegisteredToolNames();
    expect(new Set(registered)).toEqual(new Set(EXPECTED_TOOL_NAMES));
    expect(registered).toHaveLength(EXPECTED_TOOL_NAMES.length);
  });

  it('keeps the canonical tool-name enum equal to the public surface', () => {
    expect(new Set(MCP_TOOL_NAMES)).toEqual(new Set(EXPECTED_TOOL_NAMES));
    expect(Object.values(McpToolName)).toHaveLength(EXPECTED_TOOL_NAMES.length);
  });

  it('does not register any removed legacy tool', () => {
    const registered = new Set(collectRegisteredToolNames());
    for (const name of REMOVED_TOOL_NAMES)
      expect(registered.has(name)).toBe(false);
  });

  it('advertises literal cleanup confirmation for review_state', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.REVIEW_STATE,
      )?.inputSchema;
      // Match the property, not a JSON substring: field descriptions are part
      // of the advertised schema and would break an exact-serialization check.
      expect(schema).toMatchObject({
        properties: { confirm: { type: 'boolean', const: true } },
      });
    } finally {
      await connection.close();
    }
  });

  it('advertises the review_state scope action', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.REVIEW_STATE,
      )?.inputSchema;
      expect(schema).toMatchObject({
        properties: { action: { enum: expect.arrayContaining(['scope']) } },
      });
    } finally {
      await connection.close();
    }
  });

  it('describes every advertised input field of every tool', async () => {
    const connection = await connectTestClient();
    try {
      const { tools } = await connection.client.listTools();
      const undescribed = tools.flatMap(({ name, inputSchema }) =>
        Object.entries(
          (inputSchema.properties ?? {}) as Record<
            string,
            { description?: string }
          >,
        )
          .filter(([, property]) => !property.description?.trim())
          .map(([field]) => `${name}.${field}`),
      );

      // The MCP surface is the whole contract an LLM caller ever sees. A bare
      // field name is where `maxDepth` got read as a traversal limit.
      expect(undescribed).toEqual([]);
      // Guard bites: the sweep actually visited fields.
      expect(tools).toHaveLength(EXPECTED_TOOL_NAMES.length);
    } finally {
      await connection.close();
    }
  });

  it('advertises planPath as required in structure plan modes', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.STRUCTURE_VALIDATE,
      )?.inputSchema;
      expect(schema).toMatchObject({
        properties: {
          mode: {
            enum: Object.values(STRUCTURE_VALIDATION_MODES),
          },
          planPath: {
            type: 'string',
          },
        },
      });
    } finally {
      await connection.close();
    }
  });

  it('advertises a non-empty project adapter selection', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.PROJECT_INIT,
      )?.inputSchema;
      expect(schema).toMatchObject({
        properties: {
          adapterIds: {
            minItems: 1,
          },
        },
      });
    } finally {
      await connection.close();
    }
  });

  it('advertises context resolution as a non-empty request batch', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.CONTEXT_RESOLVE,
      )?.inputSchema;
      expect(schema).toMatchObject({
        required: ['path', 'requests'],
        properties: {
          requests: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['targetPath'],
              properties: {
                targetPath: { type: 'string' },
                comparePaths: { type: 'array' },
              },
            },
          },
        },
      });
      expect(schema?.properties).not.toHaveProperty('targetPath');
      expect(schema?.properties).not.toHaveProperty('comparePaths');
    } finally {
      await connection.close();
    }
  });

  it('returns invalid project input as a structured Filid error', async () => {
    const connection = await connectTestClient();
    try {
      const result = await connection.client.callTool({
        name: McpToolName.PROJECT_INIT,
        arguments: INVALID_PROJECT_INIT_INPUT,
      });
      const resultContent = result.content;
      expect(Array.isArray(resultContent)).toBe(true);
      if (!Array.isArray(resultContent))
        throw new Error('expected content array');
      const content: unknown = resultContent[0];
      expect(result.isError).toBe(true);
      expect(content).toMatchObject({ type: 'text' });
      if (
        !content ||
        typeof content !== 'object' ||
        !('text' in content) ||
        typeof content.text !== 'string'
      )
        throw new Error('expected text content');
      // A rejected argument is the caller's to fix, and carries its own code —
      // TOOL_ERROR_DIAGNOSTIC_CODE stays reserved for handler execution faults.
      expect(JSON.parse(content.text)).toMatchObject({
        diagnostics: [{ code: TOOL_INPUT_DIAGNOSTIC_CODE }],
      });
    } finally {
      await connection.close();
    }
  });

  it('rejects removed scalar context fields beside a request batch', async () => {
    const connection = await connectTestClient();
    try {
      const result = await connection.client.callTool({
        name: McpToolName.CONTEXT_RESOLVE,
        arguments: {
          path: '/project',
          requests: [{ targetPath: '/project/source.unit' }],
          targetPath: '/project/source.unit',
        },
      });
      const resultContent = result.content;
      expect(Array.isArray(resultContent)).toBe(true);
      if (!Array.isArray(resultContent))
        throw new Error('expected content array');
      const content: unknown = resultContent[0];
      expect(result.isError).toBe(true);
      expect(content).toMatchObject({ type: 'text' });
      if (
        !content ||
        typeof content !== 'object' ||
        !('text' in content) ||
        typeof content.text !== 'string'
      )
        throw new Error('expected text content');
      expect(JSON.parse(content.text)).toMatchObject({
        diagnostics: [{ code: TOOL_INPUT_DIAGNOSTIC_CODE }],
      });
    } finally {
      await connection.close();
    }
  });
});
