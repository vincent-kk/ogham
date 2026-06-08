import { mkdtempSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { YOUTUBE_MCP_KEY } from '../../constants/youtubeServer.js';
import { provisionAntigravityYoutube } from '../provisionAntigravity.js';

let dir: string;
let configPath: string;

async function readConfig(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(configPath, 'utf8')) as Record<
    string,
    unknown
  >;
}

function servers(config: Record<string, unknown>): Record<string, unknown> {
  return config.mcpServers as Record<string, unknown>;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'agy-mcp-'));
  configPath = join(dir, 'nested', 'mcp_config.json');
});

afterEach(() => {
  // tmp dirs are reaped by the OS; nothing persistent to clean.
});

describe('provisionAntigravityYoutube', () => {
  it('adds the youtube-transcript server with the language env when enabling', async () => {
    const result = await provisionAntigravityYoutube(true, 'ko', configPath);
    expect(result).toEqual({ ok: true, action: 'added' });
    expect(servers(await readConfig())).toMatchObject({
      [YOUTUBE_MCP_KEY]: {
        command: 'npx',
        args: ['-y', '@ogham/yt-dlp-mcp'],
        env: { YTDLP_LANG: 'ko' },
      },
    });
  });

  it('removes the server when disabling', async () => {
    await provisionAntigravityYoutube(true, 'en', configPath);
    const result = await provisionAntigravityYoutube(false, 'en', configPath);
    expect(result.action).toBe('removed');
    expect(servers(await readConfig())).toEqual({});
  });

  it('is a no-op (no write) when already in the desired state', async () => {
    await provisionAntigravityYoutube(true, 'en', configPath);
    const before = await readFile(configPath, 'utf8');
    const result = await provisionAntigravityYoutube(true, 'en', configPath);
    expect(result.action).toBe('unchanged');
    expect(await readFile(configPath, 'utf8')).toBe(before);
  });

  it('rewrites the env when the language changes', async () => {
    await provisionAntigravityYoutube(true, 'en', configPath);
    const result = await provisionAntigravityYoutube(true, 'ko', configPath);
    expect(result.action).toBe('added');
    const entry = servers(await readConfig())[YOUTUBE_MCP_KEY] as Record<
      string,
      unknown
    >;
    expect(entry.env).toEqual({ YTDLP_LANG: 'ko' });
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
    await provisionAntigravityYoutube(true, 'en', configPath);
    const config = await readConfig();
    expect(config.someTopLevel).toBe(1);
    expect(servers(config)).toHaveProperty('other');
    expect(servers(config)).toHaveProperty(YOUTUBE_MCP_KEY);
  });

  it('degrades to ok:false on malformed JSON without throwing', async () => {
    await mkdir(dir, { recursive: true });
    configPath = join(dir, 'mcp_config.json');
    await writeFile(configPath, '{ not valid json');
    const result = await provisionAntigravityYoutube(true, 'en', configPath);
    expect(result.ok).toBe(false);
    expect(result.action).toBe('unchanged');
  });
});
