import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import { readConfig } from '../helpers/diskAssert.js';
import { parseToolCallText } from '../helpers/envelopeShape.js';
import { httpGet, httpPostJson, httpPostRaw } from '../helpers/httpClient.js';
import {
  type LayerBClient,
  makeLayerBClient,
} from '../helpers/mcpClientLayerB.js';

interface OpenSettingsOutput {
  url: string;
  message: string;
  reused: boolean;
}

function buildPath(url: string, pathname: string): string {
  const u = new URL(url);
  const token = u.searchParams.get('token') ?? '';
  return `${u.origin}${pathname}?token=${encodeURIComponent(token)}`;
}

function buildPathWithToken(
  url: string,
  pathname: string,
  token: string,
): string {
  const u = new URL(url);
  return `${u.origin}${pathname}?token=${encodeURIComponent(token)}`;
}

async function openSettings(
  client: LayerBClient['client'],
): Promise<OpenSettingsOutput> {
  const result = await client.callTool({
    name: 'open_settings',
    arguments: {},
  });
  return parseToolCallText(result.content) as OpenSettingsOutput;
}

describe('open_settings (Layer B)', () => {
  let handle: LayerBClient;
  let currentUrl: string | null = null;

  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
    handle = await makeLayerBClient();
    currentUrl = null;
  });

  afterEach(async () => {
    if (currentUrl) {
      try {
        await httpPostJson(buildPath(currentUrl, '/close'), {});
      } catch {
        // ignore - already closed
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    await handle.close();
  });

  it('full lifecycle via spawned bundle (HTML, /config, /save, /close)', async () => {
    const out = await openSettings(handle.client);
    currentUrl = out.url;
    expect(out.reused).toBe(false);
    expect(out.url).toMatch(
      /^http:\/\/127\.0\.0\.1:\d+\/\?token=[0-9a-f]{32}$/,
    );

    const root = await httpGet(out.url);
    expect(root.status).toBe(200);
    expect(root.body.toLowerCase()).toContain('<html');

    const cfg = await httpGet(buildPath(out.url, '/config'));
    expect(cfg.status).toBe(200);
    const cfgJson = JSON.parse(cfg.body) as Record<string, unknown>;

    const save = await httpPostJson(buildPath(out.url, '/save'), {
      ...cfgJson,
      intervention_strength: -1,
    });
    expect(save.status).toBe(200);
    const disk = await readConfig();
    expect(disk?.intervention_strength).toBe(-1);

    const close = await httpPostJson(buildPath(out.url, '/close'), {});
    expect(close.status).toBe(200);
    currentUrl = null;
  });

  it('second open_settings call within same MCP process returns reused=true', async () => {
    const first = await openSettings(handle.client);
    expect(first.reused).toBe(false);
    currentUrl = first.url;

    const second = await openSettings(handle.client);
    expect(second.reused).toBe(true);
    expect(second.url).toBe(first.url);
  });

  it('rejects invalid token with 401', async () => {
    const out = await openSettings(handle.client);
    currentUrl = out.url;
    const res = await httpGet(buildPathWithToken(out.url, '/', 'wrong-token'));
    expect(res.status).toBe(401);
  });

  it('rejects POST without application/json with 415', async () => {
    const out = await openSettings(handle.client);
    currentUrl = out.url;
    const res = await httpPostRaw(
      buildPath(out.url, '/save'),
      'plain',
      'text/plain',
    );
    expect(res.status).toBe(415);
  });

  it('returns 404 for unknown paths', async () => {
    const out = await openSettings(handle.client);
    currentUrl = out.url;
    const res = await httpGet(buildPath(out.url, '/no-such-route'));
    expect(res.status).toBe(404);
  });
});
