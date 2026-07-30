import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CENNAD_HOME } from '../../../constants/paths.js';
import { readConfig } from '../helpers/diskAssert.js';
import { parseToolCallText } from '../helpers/envelopeShape.js';
import { httpGet, httpPostJson, httpPostRaw } from '../helpers/httpClient.js';
import {
  type LayerAClient,
  makeLayerAClient,
} from '../helpers/mcpClientLayerA.js';

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
  client: LayerAClient['client'],
): Promise<OpenSettingsOutput> {
  const result = await client.callTool({
    name: 'open_settings',
    arguments: {},
  });
  return parseToolCallText(result.content) as OpenSettingsOutput;
}

describe('open_settings (Layer A)', () => {
  let handle: LayerAClient;
  let currentUrl: string | null = null;

  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
    handle = await makeLayerAClient();
    currentUrl = null;
  });

  afterEach(async () => {
    if (currentUrl) {
      try {
        await httpPostJson(buildPath(currentUrl, '/close'), {});
      } catch {
        // already closed
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    await handle.close();
  });

  it('serves HTML, /config, /save (disk), /close lifecycle', async () => {
    const out = await openSettings(handle.client);
    currentUrl = out.url;
    expect(out.url).toMatch(
      /^http:\/\/127\.0\.0\.1:\d+\/\?token=[0-9a-f]{32}$/,
    );

    const root = await httpGet(out.url);
    expect(root.status).toBe(200);
    expect(root.body.toLowerCase()).toContain('<html');
    // Inline state slot replaced with the current config JSON.
    expect(root.body).toContain('"ratio"');
    expect(root.body).toContain(`"value":${DEFAULT_CONFIG.ratio.codex.value}`);

    // `/config` answers with the scope envelope — both layers, their paths and
    // the merge — because the page draws the scope toggle from it. The form
    // hydrates from `state.effective`.
    const cfg = await httpGet(buildPath(out.url, '/config'));
    expect(cfg.status).toBe(200);
    const cfgJson = JSON.parse(cfg.body) as {
      state: {
        paths: { user: string; project: string | null };
        layers: { user: Record<string, unknown> | null };
        effective: { ratio: { codex: { value: number } } };
      };
    };
    expect(cfgJson.state).toMatchObject({
      paths: expect.any(Object),
      layers: expect.any(Object),
      effective: expect.any(Object),
    });
    // `/config` reports what the files hold, not the schema defaults —
    // `mergeWithDefaults` belongs to the read path. `beforeEach` wipes
    // CENNAD_HOME, so the merge is empty here; the defaulted view is the one
    // inlined into the page above (`"value":34`).
    expect(cfgJson.state.effective).toEqual({});

    // `/save` names the layer it writes, and a user payload is a **complete**
    // document — validation runs on the merged preview against the strict
    // schema. On a wiped home the page's form is seated on `DEFAULT_CONFIG`,
    // so that is what a Save from this state submits.
    const save = await httpPostJson(buildPath(out.url, '/save'), {
      scope: 'user',
      config: { ...DEFAULT_CONFIG, intervention_strength: 2 },
    });
    expect(save.status).toBe(200);
    const disk = await readConfig();
    expect(disk?.intervention_strength).toBe(2);

    const close = await httpPostJson(buildPath(out.url, '/close'), {});
    expect(close.status).toBe(200);
    currentUrl = null;
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
      'plain text',
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
