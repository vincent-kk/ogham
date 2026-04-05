/**
 * @file server-schema-ref-free.test.ts
 * @description Regression guard — every MCP tool's emitted JSON Schema must
 *              be structurally ref-free (Claude Code rejects schemas with
 *              internal $ref). See plan: imbas-mcp-schema-ref-fix.md
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';

type Captured = { name: string; inputSchema: ZodTypeAny; description?: string };
const captured: Captured[] = [];

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(function () {
    return {
      registerTool: vi.fn(function (
        name: string,
        opts: { description?: string; inputSchema: ZodTypeAny },
      ) {
        captured.push({ name, inputSchema: opts.inputSchema, description: opts.description });
      }),
      tool: vi.fn(),
      connect: vi.fn(),
    };
  }),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

beforeAll(async () => {
  vi.resetModules();
  const { createServer } = await import('../mcp/server/server.js');
  createServer();
});

function hasRef(node: unknown): boolean {
  if (node === null || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(hasRef);
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === '$ref') return true;
    if (hasRef(v)) return true;
  }
  return false;
}

const sdkOpts = { strictUnions: true, pipeStrategy: 'input' as const };
const convert = (s: ZodTypeAny) => zodToJsonSchema(s, sdkOpts);

describe('MCP inputSchema is structurally ref-free', () => {
  it('run_transition emits JSON Schema with zero $ref', () => {
    const entry = captured.find((c) => c.name === 'run_transition');
    expect(entry, 'run_transition not registered').toBeDefined();
    const json = convert(entry!.inputSchema);
    expect(
      hasRef(json),
      `run_transition JSON Schema contains $ref:\n${JSON.stringify(json, null, 2)}`,
    ).toBe(false);
  });

  it('all 15 registered tools emit JSON Schemas with zero $ref', () => {
    expect(captured).toHaveLength(15);
    for (const entry of captured) {
      const json = convert(entry.inputSchema);
      expect(
        hasRef(json),
        `${entry.name} JSON Schema contains $ref:\n${JSON.stringify(json, null, 2)}`,
      ).toBe(false);
    }
  });

  it('snapshot — run_transition flat JSON Schema', () => {
    const entry = captured.find((c) => c.name === 'run_transition');
    const json = convert(entry!.inputSchema);
    expect(json).toMatchSnapshot();
  });

  it('valid start_phase payload parses via flat MCP schema AND RunTransitionSchema', async () => {
    const entry = captured.find((c) => c.name === 'run_transition');
    expect(entry).toBeDefined();
    const payload = {
      project_ref: 'PROJ',
      run_id: 'run-1',
      action: 'start_phase',
      phase: 'validate',
    };
    const mcpResult = entry!.inputSchema.safeParse(payload);
    expect(mcpResult.success, `flat MCP parse failed: ${JSON.stringify(mcpResult)}`).toBe(true);

    const { RunTransitionSchema } = await import('../types/state.js');
    const coreResult = RunTransitionSchema.safeParse(payload);
    expect(coreResult.success, `RunTransitionSchema parse failed: ${JSON.stringify(coreResult)}`).toBe(true);
  });

  it('invalid escape_phase (missing escape_code) passes flat schema but fails RunTransitionSchema', async () => {
    const entry = captured.find((c) => c.name === 'run_transition');
    expect(entry).toBeDefined();
    const payload = {
      project_ref: 'PROJ',
      run_id: 'run-1',
      action: 'escape_phase',
      phase: 'split',
    };
    const mcpResult = entry!.inputSchema.safeParse(payload);
    expect(mcpResult.success).toBe(true);

    const { RunTransitionSchema } = await import('../types/state.js');
    const coreResult = RunTransitionSchema.safeParse(payload);
    expect(coreResult.success).toBe(false);
  });
});
