/**
 * @file serverTransport.test.ts
 * @description Regression guard for the MCP transport layer (behavior-test D-2).
 *              Handler-direct tests never cross SDK schema emission or argument
 *              validation, so a `manifest` schema that emitted `{}` — coaxing
 *              clients into string-serializing the object argument — stayed
 *              invisible to the unit suite. These cases run the real server
 *              over the SDK's in-memory transport.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createServer } from '../mcp/server/index.js';

function makeTmpDir(): string {
  const dir = join(
    os.tmpdir(),
    `imbas-tp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

const estimationManifest = {
  run_id: '20260101-001',
  project_ref: 'PROJ',
  source: 'refined.md',
  created_at: '2026-01-01T00:00:00.000Z',
  units: [
    {
      id: 'U-1',
      name: 'Login',
      view_refs: {
        page: ['login'],
        feature: ['email-login'],
        module: ['auth'],
      },
      complexity: 'M',
      estimate: { o: 1, m: 3, p: 5, expected: 3, sigma: 0.67 },
      rationale: 'standard flow',
    },
  ],
  rollup: {
    sum_expected: 3,
    overhead: { integration: 0.3, test: 0.45, pm: 0.15 },
    buffered_total: 4.7,
    confidence_interval: [3.6, 5.7],
  },
  schedule: {
    tracks: [{ track: 1, units: ['U-1'] }],
    milestones: [],
    total_weeks: 1,
  },
};

describe('MCP transport — manifest_save', () => {
  let client: Client;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'imbas-transport-test', version: '0.0.0' });
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterEach(async () => {
    await client.close();
  });

  function savedPath(): string {
    return join(
      tmpDir,
      '.imbas',
      'PROJ',
      'runs',
      '20260101-001',
      'estimation.json',
    );
  }

  it('advertises manifest as an object-typed argument, not an empty schema', async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === 'manifest_save');
    expect(tool, 'manifest_save not listed').toBeDefined();
    const properties = (
      tool!.inputSchema as { properties?: Record<string, unknown> }
    ).properties;
    const manifest = properties?.manifest;
    expect(
      manifest,
      'manifest property missing from emitted schema',
    ).toBeDefined();
    const emitted = JSON.stringify(manifest);
    expect(
      emitted,
      `manifest schema must declare an object type, got: ${emitted}`,
    ).toContain('"type":"object"');
    expect(emitted).not.toContain('$ref');
  });

  it('saves a manifest passed as an object through the transport', async () => {
    const result = await client.callTool({
      name: 'manifest_save',
      arguments: {
        project_ref: 'PROJ',
        run_id: '20260101-001',
        type: 'estimation',
        manifest: estimationManifest,
        project_root: tmpDir,
      },
    });
    expect(result.isError, JSON.stringify(result.content)).toBeFalsy();
    expect(existsSync(savedPath())).toBe(true);
  });

  it('saves a manifest passed as a JSON-encoded string through the transport', async () => {
    const result = await client.callTool({
      name: 'manifest_save',
      arguments: {
        project_ref: 'PROJ',
        run_id: '20260101-001',
        type: 'estimation',
        manifest: JSON.stringify(estimationManifest),
        project_root: tmpDir,
      },
    });
    expect(result.isError, JSON.stringify(result.content)).toBeFalsy();
    const saved = JSON.parse(readFileSync(savedPath(), 'utf-8'));
    expect(saved.units).toHaveLength(1);
  });
});
