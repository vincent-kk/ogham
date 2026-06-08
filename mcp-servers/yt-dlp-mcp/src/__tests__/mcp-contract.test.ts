import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

import { createService } from '@/core/service.js';
import { registerEnabledTools } from '@/mcp/registry/index.js';
import { createServer } from '@/mcp/server/index.js';

import { makeFakeRunner } from './helpers/fake-runner.js';
import {
  SAMPLE_JSON3,
  SAMPLE_META,
  SAMPLE_URL,
  SAMPLE_VIDEO_ID,
} from './helpers/fixtures.js';
import {
  type TestEnv,
  makeTestEnv,
  silentLogger,
} from './helpers/test-context.js';

function firstText(result: CallToolResult): string {
  const item = result.content[0];
  return item && item.type === 'text' ? item.text : '';
}

async function connectClient(
  env: TestEnv,
  files: Record<string, string> = {
    [`${SAMPLE_VIDEO_ID}.en.json3`]: SAMPLE_JSON3,
  },
): Promise<Client> {
  const runner = makeFakeRunner({ stdout: SAMPLE_META, files });
  const service = createService({
    runner,
    config: env.config,
    paths: env.paths,
    logger: silentLogger,
  });
  const server = createServer();
  registerEnabledTools(server, {
    service,
    config: env.config,
    logger: silentLogger,
  });

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return client;
}

describe('MCP contract', () => {
  it('lists the default transcript tool', async () => {
    const env = await makeTestEnv();
    const client = await connectClient(env);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('ytdlp_download_transcript');
    await client.close();
    await env.cleanup();
  });

  it('calls the transcript tool end-to-end via a fake runner', async () => {
    const env = await makeTestEnv();
    const client = await connectClient(env);
    const result = (await client.callTool({
      name: 'ytdlp_download_transcript',
      arguments: { url: SAMPLE_URL, language: 'en' },
    })) as CallToolResult;
    expect(result.isError).toBeFalsy();
    expect(firstText(result)).toContain('Hello world');
    await client.close();
    await env.cleanup();
  });

  it('surfaces typed errors as isError results', async () => {
    const env = await makeTestEnv();
    const client = await connectClient(env);
    const result = (await client.callTool({
      name: 'ytdlp_download_transcript',
      arguments: { url: 'not a url' },
    })) as CallToolResult;
    expect(result.isError).toBe(true);
    expect(firstText(result)).toContain('INVALID_INPUT');
    await client.close();
    await env.cleanup();
  });

  it('exposes language-fallback warnings in structuredContent', async () => {
    const env = await makeTestEnv();
    const client = await connectClient(env);
    const result = (await client.callTool({
      name: 'ytdlp_download_transcript',
      arguments: { url: SAMPLE_URL, language: 'ko' },
    })) as CallToolResult;
    expect(result.structuredContent?.warnings).toEqual([
      "Requested language 'ko' but served 'en'.",
    ]);
    await client.close();
    await env.cleanup();
  });

  it('flags truncation and char count in structuredContent', async () => {
    const longJson3 = JSON.stringify({
      events: Array.from({ length: 300 }, (_, i) => ({
        tStartMs: i * 1000,
        dDurationMs: 1000,
        segs: [{ utf8: `word${i} ` }],
      })),
    });
    const env = await makeTestEnv({ YTDLP_MAX_TRANSCRIPT_LENGTH: '100' });
    const client = await connectClient(env, {
      [`${SAMPLE_VIDEO_ID}.en.json3`]: longJson3,
    });
    const result = (await client.callTool({
      name: 'ytdlp_download_transcript',
      arguments: { url: SAMPLE_URL, language: 'en' },
    })) as CallToolResult;
    expect(result.structuredContent?.truncated).toBe(true);
    expect(result.structuredContent?.charCount).toBeGreaterThan(100);
    await client.close();
    await env.cleanup();
  });
});
