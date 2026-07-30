import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MCP_TOOL_NAMES } from '../../../constants/mcpToolNames.js';
import {
  type LayerBClient,
  makeLayerBClient,
} from '../helpers/mcpClientLayerB.js';

const LIGHT_HOOK_CAP = 10 * 1024;
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bfast-glob\b/,
  /\bZodObject\b/,
  /\bZodError\b/,
  /\bsafeParse\b/,
  /@modelcontextprotocol\/sdk/,
  /\blodash\b/,
  /\bmoment\b/,
  /\bdate-fns\b/,
  /Dynamic require of/,
];

const HOOK_BUNDLES = ['injectStatic.mjs', 'injectDynamic.mjs'];

function bridgeDir(): string {
  const dir = process.env.CENNAD_E2E_BRIDGE;
  if (!dir) throw new Error('CENNAD_E2E_BRIDGE not set');
  return dir;
}

describe('Hook bundle guards (Layer B)', () => {
  for (const name of HOOK_BUNDLES) {
    it(`${name} size ≤ ${LIGHT_HOOK_CAP} bytes`, async () => {
      const { size } = await stat(resolve(bridgeDir(), name));
      expect(size).toBeLessThanOrEqual(LIGHT_HOOK_CAP);
    });

    it(`${name} contains no FORBIDDEN modules`, async () => {
      const content = await readFile(resolve(bridgeDir(), name), 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS)
        expect(content).not.toMatch(pattern);
    });
  }
});

describe('MCP bundle handshake (Layer B)', () => {
  it('mcp-server.cjs spawn completes initialize handshake and lists every registered tool', async () => {
    const handle: LayerBClient = await makeLayerBClient();
    try {
      const info = handle.client.getServerVersion();
      expect(info?.name).toBe('tools');
      const { tools } = await handle.client.listTools();
      // Derived, not a literal: the tool list itself is asserted by name in
      // tools-list.layerB. What this guard adds is that the BUNDLE exposes as
      // many as the source declares — a count that drifts silently otherwise.
      expect(tools.length).toBe(MCP_TOOL_NAMES.length);
    } finally {
      await handle.close();
    }
  });
});
