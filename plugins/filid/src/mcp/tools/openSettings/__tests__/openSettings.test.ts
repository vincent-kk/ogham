import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleOpenSettings } from '../openSettings.js';

vi.mock('../utils/loadSettingsHtml.js', () => ({
  loadSettingsHtml: () =>
    "<html><script>window.s='__FILID_STATE__';</script></html>",
}));

const openBrowser = vi.hoisted(() => vi.fn());
vi.mock('@ogham/cross-platform/launcher', () => ({ openBrowser }));

let projectDir: string | null = null;
let lastUrl: string | null = null;

function saveUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}/save?token=${parsed.searchParams.get('token')}`;
}

async function closeServer(): Promise<void> {
  if (!lastUrl) return;
  const parsed = new URL(lastUrl);
  await fetch(
    `${parsed.origin}/close?token=${parsed.searchParams.get('token')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  ).catch(() => undefined);
  lastUrl = null;
}

afterEach(async () => {
  await closeServer();
  if (projectDir) {
    rmSync(projectDir, { recursive: true, force: true });
    projectDir = null;
  }
  openBrowser.mockClear();
});

describe('open_settings tool', () => {
  it('returns pending with the page URL when the wait elapses', async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'filid-settings-'));
    const out = await handleOpenSettings({ path: projectDir, waitSeconds: 1 });
    lastUrl = out.url;
    expect(out.status).toBe('pending');
    expect(out.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/\?token=/);
    expect(openBrowser).toHaveBeenCalledTimes(1);
  });

  it('reuses the running server and resolves saved when the form submits', async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'filid-settings-'));
    const first = await handleOpenSettings({
      path: projectDir,
      waitSeconds: 1,
    });
    lastUrl = first.url;

    const second = handleOpenSettings({ path: projectDir, waitSeconds: 10 });
    await new Promise((r) => setTimeout(r, 50));
    const res = await fetch(saveUrl(first.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: { version: '1.0', rules: {}, language: 'Korean' },
        ruleDocs: { selections: {}, resync: [] },
      }),
    });
    expect(res.status).toBe(200);

    const out = await second;
    expect(out.status).toBe('saved');
    expect(out.url).toBe(first.url);
    expect(out.summary?.configWritten).toBe(true);
    // Reuse must not respawn a browser tab.
    expect(openBrowser).toHaveBeenCalledTimes(1);
  });

  it('persists the submitted config to .filid/config.json in the target project', async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'filid-settings-'));
    const pending = await handleOpenSettings({
      path: projectDir,
      waitSeconds: 1,
    });
    lastUrl = pending.url;

    const waiting = handleOpenSettings({ path: projectDir, waitSeconds: 10 });
    await new Promise((r) => setTimeout(r, 50));
    await fetch(saveUrl(pending.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: { version: '1.0', rules: {}, language: 'Korean' },
        ruleDocs: { selections: {}, resync: [] },
      }),
    });
    await waiting;

    const configPath = join(projectDir, '.filid', 'config.json');
    expect(existsSync(configPath)).toBe(true);
    const written = JSON.parse(readFileSync(configPath, 'utf8')) as {
      language?: string;
    };
    expect(written.language).toBe('Korean');
  });

  it('resolves closed when the page closes without saving', async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'filid-settings-'));
    const pending = await handleOpenSettings({
      path: projectDir,
      waitSeconds: 1,
    });
    lastUrl = pending.url;

    const waiting = handleOpenSettings({ path: projectDir, waitSeconds: 10 });
    await new Promise((r) => setTimeout(r, 50));
    await closeServer();

    const out = await waiting;
    expect(out.status).toBe('closed');
    expect(existsSync(join(projectDir, '.filid', 'config.json'))).toBe(false);
  });
});
