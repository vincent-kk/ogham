import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FRACTAL_INSPECT_ACTIONS,
  PROJECT_SETUP_ACTIONS,
  RESTRUCTURE_ACTIONS,
} from '../../constants/mcpContracts.js';
import { MCP_TOOL_NAMES, McpToolName } from '../../constants/mcpToolNames.js';
import { TOOL_INPUT_DIAGNOSTIC_CODE } from '../../constants/toolEnvelope.js';
import { createServer } from '../../mcp/server/lifecycle/createServer.js';

import { connectTestClient } from './helpers/connectTestClient.js';

const EXPECTED_TOOL_NAMES = [
  'project_setup',
  'fractal_inspect',
  'restructure',
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
  action: PROJECT_SETUP_ACTIONS.INIT,
  path: '/project',
  adapterIds: ['ecmascript'],
};
const INVALID_PROJECT_INIT_INPUT = {
  ...PROJECT_INIT_INPUT,
  adapterIds: [],
};
/**
 * Collects the tool names registered while constructing the MCP server.
 *
 * @returns Tool names in registration order.
 */
function collectRegisteredToolNames(): string[] {
  const registerTool = vi.spyOn(McpServer.prototype, 'registerTool');
  createServer();
  return registerTool.mock.calls.map(([name]) => name);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Filid 1.0 MCP tool surface', () => {
  it('registers exactly the four action-dispatched tool names', () => {
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

  it('advertises the review_state v7 action fields', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.REVIEW_STATE,
      )?.inputSchema;
      expect(schema).toMatchObject({
        properties: {
          action: {
            enum: [
              'prepare',
              'checkpoint',
              'validate',
              'seal',
              'cleanup',
              'assess',
            ],
          },
          effort: { enum: ['low', 'medium', 'high'] },
          kind: { enum: ['review', 'verify'] },
          group: { type: 'string' },
          round: { type: 'integer', minimum: 1 },
        },
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

  it('advertises the project-setup action union and optional shared path', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.PROJECT_SETUP,
      )?.inputSchema;
      expect(schema).toMatchObject({
        required: ['action'],
        properties: {
          action: {
            enum: Object.values(PROJECT_SETUP_ACTIONS),
          },
          path: { type: 'string' },
          adapterIds: {
            type: 'array',
            minItems: 1,
          },
        },
      });
    } finally {
      await connection.close();
    }
  });

  it('advertises inspection actions and non-empty resolve requests', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.FRACTAL_INSPECT,
      )?.inputSchema;
      expect(schema).toMatchObject({
        required: ['action', 'path'],
        properties: {
          action: { enum: Object.values(FRACTAL_INSPECT_ACTIONS) },
          path: { type: 'string' },
          detail: { enum: ['summary', 'paths', 'full', 'files'] },
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

  it('advertises restructure actions and the optional plan path', async () => {
    const connection = await connectTestClient();
    try {
      const tools = await connection.client.listTools();
      const schema = tools.tools.find(
        ({ name }) => name === McpToolName.RESTRUCTURE,
      )?.inputSchema;
      expect(schema).toMatchObject({
        required: ['action', 'path'],
        properties: {
          action: { enum: Object.values(RESTRUCTURE_ACTIONS) },
          path: { type: 'string' },
          requests: {
            type: 'array',
          },
          planPath: { type: 'string' },
        },
      });
    } finally {
      await connection.close();
    }
  });

  it('returns invalid project input as a structured Filid error', async () => {
    const connection = await connectTestClient();
    try {
      const result = await connection.client.callTool({
        name: McpToolName.PROJECT_SETUP,
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
        name: McpToolName.FRACTAL_INSPECT,
        arguments: {
          action: FRACTAL_INSPECT_ACTIONS.RESOLVE,
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

  it('requires planPath for restructure validation actions', async () => {
    const connection = await connectTestClient();
    try {
      const result = await connection.client.callTool({
        name: McpToolName.RESTRUCTURE,
        arguments: {
          action: RESTRUCTURE_ACTIONS.PRECONDITION,
          path: '/project',
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

  it('requires path for project-setup rule synchronization', async () => {
    const connection = await connectTestClient();
    try {
      const result = await connection.client.callTool({
        name: McpToolName.PROJECT_SETUP,
        arguments: {
          action: PROJECT_SETUP_ACTIONS.RULES_SYNC,
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
