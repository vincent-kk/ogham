import { afterEach, describe, expect, it } from 'vitest';

import { ImbasConfigSchema } from '../../../../../types/config.js';
import type {
  SettingsPageState,
  SettingsSaveBody,
  SettingsSaveSummary,
} from '../../../../../types/settings.js';
import {
  type SettingsServerInstance,
  startSettingsServer,
} from '../webServer.js';

const DEFAULT_CONFIG = ImbasConfigSchema.parse({});

const STATE: SettingsPageState = {
  projectRoot: '/tmp/project',
  configExists: true,
  config: DEFAULT_CONFIG,
  suggestedLocalKey: 'PROJECT',
  bootstrap: { providers: { jira: true } },
};

const VALID_BODY = {
  config: DEFAULT_CONFIG,
  options: { provision_labels: false },
};

const SUMMARY: SettingsSaveSummary = {
  configWritten: true,
  provider: 'jira',
  projectRef: null,
  provisionLabels: false,
};

let handle: SettingsServerInstance | null = null;
let savedBody: SettingsSaveBody | null = null;

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = null;
  }
  savedBody = null;
});

interface StartOverrides {
  idleMs?: number;
  loadState?: () => Promise<SettingsPageState>;
  persistSave?: (body: SettingsSaveBody) => Promise<SettingsSaveSummary>;
  onClose?: () => void;
}

async function start(
  overrides: StartOverrides = {},
): Promise<SettingsServerInstance> {
  handle = await startSettingsServer({
    settingsHtml: "<html><script>window.s='__IMBAS_STATE__';</script></html>",
    idleMs: overrides.idleMs,
    loadState: overrides.loadState ?? (async () => STATE),
    persistSave:
      overrides.persistSave ??
      (async (body) => {
        savedBody = body;
        return SUMMARY;
      }),
    onClose: overrides.onClose,
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

function postSave(h: SettingsServerInstance, body: unknown): Promise<Response> {
  return fetch(urlFor(h, '/save'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('imbas settings web server', () => {
  it('rejects requests with a wrong or missing token (401)', async () => {
    const h = await start();
    const wrong = await fetch(urlFor(h, '/', 'bad-token'));
    expect(wrong.status).toBe(401);
    const missing = await fetch(`http://127.0.0.1:${h.port}/`);
    expect(missing.status).toBe(401);
  });

  it('inlines the page state into the HTML slot on GET /', async () => {
    const h = await start();
    const res = await fetch(urlFor(h, '/'));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('"suggestedLocalKey"');
    expect(html).not.toContain('__IMBAS_STATE__');
  });

  it('escapes </script> inside inlined state fields', async () => {
    const malicious: SettingsPageState = {
      ...STATE,
      config: {
        ...DEFAULT_CONFIG,
        labels: {
          ...DEFAULT_CONFIG.labels,
          managed: '</script><script>alert(1)</script>',
        },
      },
    };
    const h = await start({ loadState: async () => malicious });
    const html = await (await fetch(urlFor(h, '/'))).text();
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

  it('POST /save persists a valid body and echoes the summary', async () => {
    const h = await start();
    const res = await postSave(h, VALID_BODY);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      summary: SettingsSaveSummary;
    };
    expect(body.success).toBe(true);
    expect(body.summary).toEqual(SUMMARY);
    expect(savedBody?.config.provider).toBe('jira');
  });

  it('POST /save returns 400 with errors[] on an invalid body', async () => {
    const h = await start();
    const res = await postSave(h, { config: { provider: 'gitlab' } });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean; errors: unknown };
    expect(body.success).toBe(false);
    expect(Array.isArray(body.errors)).toBe(true);
    expect(savedBody).toBeNull();
  });

  it('POST /save returns 500 when persistence throws', async () => {
    const h = await start({
      persistSave: async () => {
        throw new Error('disk full');
      },
    });
    const res = await postSave(h, VALID_BODY);
    expect(res.status).toBe(500);
  });

  it('settles a pending awaitSettled with saved on successful save', async () => {
    const h = await start();
    const settled = h.awaitSettled(5);
    await postSave(h, VALID_BODY);
    await expect(settled).resolves.toEqual({ kind: 'saved', summary: SUMMARY });
  });

  it('settles a pending awaitSettled with closed on POST /close', async () => {
    const h = await start();
    const settled = h.awaitSettled(5);
    const res = await fetch(urlFor(h, '/close'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
    await expect(settled).resolves.toEqual({ kind: 'closed' });
    handle = null;
  });

  it('resolves awaitSettled as pending on timeout and on abort', async () => {
    const h = await start();
    await expect(h.awaitSettled(0.05)).resolves.toEqual({ kind: 'pending' });

    const controller = new AbortController();
    const aborted = h.awaitSettled(5, controller.signal);
    controller.abort();
    await expect(aborted).resolves.toEqual({ kind: 'pending' });
  });

  it('auto-closes after idleMs of inactivity but defers while a waiter is active', async () => {
    const h = await start({ idleMs: 80 });
    const settled = h.awaitSettled(0.4);
    await new Promise((r) => setTimeout(r, 200));
    // Would have idle-closed at 80ms without the active-waiter deferral.
    const res = await fetch(urlFor(h, '/'));
    expect(res.status).toBe(200);
    await settled;
    await new Promise((r) => setTimeout(r, 250));
    await expect(fetch(urlFor(h, '/'))).rejects.toThrow();
    handle = null;
  });

  it('close is idempotent and fires onClose once', async () => {
    let closedCount = 0;
    const h = await start({
      idleMs: 60,
      onClose: () => {
        closedCount += 1;
      },
    });
    await new Promise((r) => setTimeout(r, 160));
    expect(closedCount).toBe(1);
    await h.close();
    expect(closedCount).toBe(1);
    handle = null;
  });
});
