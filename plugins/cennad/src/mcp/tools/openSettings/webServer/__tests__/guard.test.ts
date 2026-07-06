import { request as httpRequest } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../../constants/defaults.js';
import { type SettingsServerInstance, startSettingsServer } from '../index.js';

let handle: SettingsServerInstance | null = null;

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = null;
  }
});

async function start(): Promise<SettingsServerInstance> {
  handle = await startSettingsServer({
    settingsHtml: '<html>__CENNAD_STATE__</html>',
    loadConfig: async () => DEFAULT_CONFIG,
    saveConfig: async () => {},
    // Stub provisioning so a passing /save never touches real CLI MCP configs.
    provisionYoutube: async () => ({
      antigravity: { ok: true, action: 'unchanged' },
      codex: { ok: true, action: 'unchanged' },
    }),
  });
  return handle;
}

// node:http (not fetch) — fetch strips forbidden headers like Host/Origin.
function rawRequest(opts: {
  port: number;
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port: opts.port,
        path: opts.path,
        method: opts.method ?? 'GET',
        headers: opts.headers ?? {},
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: data }),
        );
      },
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

describe('settings server guard', () => {
  it('rejects a forged non-loopback Host with 403 (DNS rebinding)', async () => {
    const h = await start();
    const res = await rawRequest({
      port: h.port,
      path: `/config?token=${h.token}`,
      headers: { host: 'evil.example.com' },
    });
    expect(res.status).toBe(403);
  });

  it('allows a loopback Host with a valid token', async () => {
    const h = await start();
    const res = await rawRequest({
      port: h.port,
      path: `/config?token=${h.token}`,
    });
    expect(res.status).toBe(200);
  });

  it('rejects a cross-origin POST /save with 403 Invalid origin', async () => {
    const h = await start();
    const res = await rawRequest({
      port: h.port,
      path: `/save?token=${h.token}`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.example.com',
      },
      body: JSON.stringify(DEFAULT_CONFIG),
    });
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body).message).toBe('Invalid origin');
  });

  it('allows a same-origin loopback POST /save', async () => {
    const h = await start();
    const res = await rawRequest({
      port: h.port,
      path: `/save?token=${h.token}`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: `http://127.0.0.1:${h.port}`,
      },
      body: JSON.stringify(DEFAULT_CONFIG),
    });
    expect(res.status).toBe(200);
  });
});
