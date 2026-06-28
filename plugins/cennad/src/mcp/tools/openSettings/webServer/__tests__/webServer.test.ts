import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../../constants/defaults.js';
import type { YoutubeProvisionSummary } from '../../../../../core/youtubeMcp/index.js';
import type { Config, YoutubeAddonConfig } from '../../../../../types/index.js';
import { type SettingsServerInstance, startSettingsServer } from '../index.js';

let handle: SettingsServerInstance | null = null;
let savedConfig: Config | null = null;
let provisionedWith: YoutubeAddonConfig | null = null;

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = null;
  }
  savedConfig = null;
  provisionedWith = null;
});

interface StartOverrides {
  idleMs?: number;
  loadConfig?: () => Promise<Config>;
  saveConfig?: (config: Config) => Promise<void>;
  provisionYoutube?: (
    next: YoutubeAddonConfig,
    prev?: YoutubeAddonConfig,
  ) => Promise<YoutubeProvisionSummary>;
  settingsHtml?: string;
}

async function start(
  overrides: StartOverrides = {},
): Promise<SettingsServerInstance> {
  handle = await startSettingsServer({
    settingsHtml:
      overrides.settingsHtml ??
      "<html><script>window.s='__CENNAD_STATE__';</script></html>",
    idleMs: overrides.idleMs,
    loadConfig: overrides.loadConfig ?? (async () => DEFAULT_CONFIG),
    saveConfig:
      overrides.saveConfig ??
      (async (cfg) => {
        savedConfig = cfg;
      }),
    // Stub provisioning so /save tests never touch real CLI MCP configs.
    provisionYoutube:
      overrides.provisionYoutube ??
      (async (next) => {
        provisionedWith = next;
        return {
          antigravity: { ok: true, action: 'unchanged' },
          codex: { ok: true, action: 'unchanged' },
        };
      }),
  });
  return handle;
}

function urlFor(
  h: SettingsServerInstance,
  path: string,
  tokenOverride?: string,
): string {
  const t = tokenOverride ?? h.token;
  return `http://127.0.0.1:${h.port}${path}?token=${encodeURIComponent(t)}`;
}

describe('settings web server', () => {
  it('rejects requests with the wrong token (401)', async () => {
    const h = await start();
    const res = await fetch(urlFor(h, '/config', 'bad-token'));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('rejects requests with no token at all (401)', async () => {
    const h = await start();
    const res = await fetch(`http://127.0.0.1:${h.port}/config`);
    expect(res.status).toBe(401);
  });

  it('serves GET /config with the current Config payload', async () => {
    const h = await start();
    const res = await fetch(urlFor(h, '/config'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(DEFAULT_CONFIG);
  });

  it('inlines the current Config into the HTML state slot on GET /', async () => {
    const h = await start();
    const res = await fetch(urlFor(h, '/'));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('"ratio"');
    expect(html).not.toContain('__CENNAD_STATE__');
  });

  it('escapes </script> inside inlined Config fields', async () => {
    const malicious: Config = {
      ...DEFAULT_CONFIG,
      keywords: {
        codex: 'safe',
        antigravity: 'safe',
        claude: '</script><script>alert(1)</script>',
      },
    };
    const h = await start({ loadConfig: async () => malicious });
    const res = await fetch(urlFor(h, '/'));
    const html = await res.text();
    expect(html).not.toContain('</script><script>');
    expect(html).toContain('\\u003c/script\\u003e');
  });

  it('rejects POST without application/json Content-Type (415)', async () => {
    const h = await start();
    const res = await fetch(urlFor(h, '/save'), {
      method: 'POST',
      body: 'foo',
    });
    expect(res.status).toBe(415);
  });

  it('POST /save persists a valid Config', async () => {
    const h = await start();
    const updated: Config = { ...DEFAULT_CONFIG, session_ttl_hours: 24 };
    const res = await fetch(urlFor(h, '/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    expect(res.status).toBe(200);
    expect(savedConfig).toEqual(updated);
  });

  it('POST /save reloads the in-memory config for later settings requests', async () => {
    let stored: Config = DEFAULT_CONFIG;
    let loadCalls = 0;
    const h = await start({
      loadConfig: async () => {
        loadCalls += 1;
        return stored;
      },
      saveConfig: async (cfg) => {
        stored = cfg;
        savedConfig = cfg;
      },
    });
    const updated: Config = { ...DEFAULT_CONFIG, session_ttl_hours: 24 };

    const saveRes = await fetch(urlFor(h, '/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    expect(saveRes.status).toBe(200);
    expect(savedConfig).toEqual(updated);
    expect(loadCalls).toBe(2);

    const configRes = await fetch(urlFor(h, '/config'));
    expect(configRes.status).toBe(200);
    expect(await configRes.json()).toEqual(updated);

    const rootRes = await fetch(urlFor(h, '/'));
    expect(rootRes.status).toBe(200);
    expect(await rootRes.text()).toContain('"session_ttl_hours":24');
  });

  it('POST /save provisions the youtube MCP addon from the saved config', async () => {
    const h = await start();
    const updated: Config = {
      ...DEFAULT_CONFIG,
      addons: {
        youtube: {
          enabled: true,
          language: 'ko',
          targets: { codex: true, antigravity: true },
        },
      },
    };
    const res = await fetch(urlFor(h, '/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const body = (await res.json()) as {
      youtube: {
        antigravity: { ok: boolean; action: string };
        codex: { ok: boolean; action: string };
      };
    };
    expect(res.status).toBe(200);
    expect(provisionedWith).toEqual(updated.addons.youtube);
    expect(body.youtube.antigravity).toEqual({ ok: true, action: 'unchanged' });
    expect(body.youtube.codex).toEqual({ ok: true, action: 'unchanged' });
  });

  it('POST /save returns 400 with errors[] on invalid Config', async () => {
    const h = await start();
    const res = await fetch(urlFor(h, '/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ratio: { gemini: 'oops', codex: 1 } }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean; errors: unknown };
    expect(body.success).toBe(false);
    expect(Array.isArray(body.errors)).toBe(true);
  });

  it('POST /close terminates the server', async () => {
    const h = await start();
    const res = await fetch(urlFor(h, '/close'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    await expect(fetch(urlFor(h, '/config'))).rejects.toThrow();
    handle = null;
  });

  it('auto-closes after idleMs of inactivity', async () => {
    const h = await start({ idleMs: 80 });
    await new Promise((r) => setTimeout(r, 200));
    await expect(fetch(urlFor(h, '/config'))).rejects.toThrow();
    handle = null;
  });

  it('keeps the server alive while requests arrive within idleMs', async () => {
    const h = await start({ idleMs: 200 });
    await new Promise((r) => setTimeout(r, 120));
    const res = await fetch(urlFor(h, '/config'));
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 120));
    const res2 = await fetch(urlFor(h, '/config'));
    expect(res2.status).toBe(200);
  });

  it('invokes onClose when the server shuts down (timer-triggered)', async () => {
    let closedCount = 0;
    const local = await startSettingsServer({
      settingsHtml: '<html>__CENNAD_STATE__</html>',
      idleMs: 80,
      loadConfig: async () => DEFAULT_CONFIG,
      saveConfig: async () => {},
      onClose: () => {
        closedCount += 1;
      },
    });
    await new Promise((r) => setTimeout(r, 200));
    expect(closedCount).toBe(1);
    // Already closed; idempotent close should not double-fire.
    await local.close();
    expect(closedCount).toBe(1);
  });
});
