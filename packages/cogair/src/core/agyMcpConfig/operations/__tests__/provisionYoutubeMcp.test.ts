import { mkdtempSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ANTIGRAVITY_YOUTUBE_MCP_KEY } from '../../constants/youtubeServer.js';
import { provisionYoutubeMcp } from '../provisionYoutubeMcp.js';

let dir: string;
let configPath: string;

async function readConfig(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(configPath, 'utf8')) as Record<
    string,
    unknown
  >;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'agy-mcp-'));
  configPath = join(dir, 'nested', 'mcp_config.json');
});

afterEach(() => {
  // tmp dirs are reaped by the OS; nothing persistent to clean.
});

describe('provisionYoutubeMcp', () => {
  it('adds the youtube-transcript server when enabling from no file', async () => {
    const result = await provisionYoutubeMcp(true, configPath);
    expect(result).toEqual({ ok: true, action: 'added', path: configPath });
    const config = await readConfig();
    expect(config.mcpServers).toMatchObject({
      [ANTIGRAVITY_YOUTUBE_MCP_KEY]: {
        command: 'npx',
        args: ['-y', '@kimtaeyoon83/mcp-server-youtube-transcript'],
      },
    });
  });

  it('removes the server when disabling', async () => {
    await provisionYoutubeMcp(true, configPath);
    const result = await provisionYoutubeMcp(false, configPath);
    expect(result.action).toBe('removed');
    const config = await readConfig();
    expect(config.mcpServers).toEqual({});
  });

  it('is a no-op (no write) when already in the desired state', async () => {
    await provisionYoutubeMcp(true, configPath);
    const before = await readFile(configPath, 'utf8');
    const result = await provisionYoutubeMcp(true, configPath);
    expect(result.action).toBe('unchanged');
    expect(await readFile(configPath, 'utf8')).toBe(before);
  });

  it('preserves other servers and top-level keys', async () => {
    await mkdir(dir, { recursive: true });
    configPath = join(dir, 'mcp_config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        someTopLevel: 1,
        mcpServers: { other: { command: 'foo', args: [] } },
      }),
    );
    await provisionYoutubeMcp(true, configPath);
    const config = await readConfig();
    expect(config.someTopLevel).toBe(1);
    expect(config.mcpServers).toHaveProperty('other');
    expect(config.mcpServers).toHaveProperty(ANTIGRAVITY_YOUTUBE_MCP_KEY);
  });

  it('does not overwrite a user-defined youtube-transcript entry', async () => {
    await mkdir(dir, { recursive: true });
    configPath = join(dir, 'mcp_config.json');
    const custom = { command: 'node', args: ['./custom-transcript.js'] };
    await writeFile(
      configPath,
      JSON.stringify({ mcpServers: { [ANTIGRAVITY_YOUTUBE_MCP_KEY]: custom } }),
    );
    const result = await provisionYoutubeMcp(true, configPath);
    expect(result.action).toBe('unchanged');
    const config = await readConfig();
    expect(
      (config.mcpServers as Record<string, unknown>)[
        ANTIGRAVITY_YOUTUBE_MCP_KEY
      ],
    ).toEqual(custom);
  });

  it('degrades to ok:false on malformed JSON without throwing', async () => {
    await mkdir(dir, { recursive: true });
    configPath = join(dir, 'mcp_config.json');
    await writeFile(configPath, '{ not valid json');
    const result = await provisionYoutubeMcp(true, configPath);
    expect(result.ok).toBe(false);
    expect(result.action).toBe('unchanged');
  });
});
