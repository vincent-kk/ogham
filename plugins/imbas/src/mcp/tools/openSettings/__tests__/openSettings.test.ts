import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImbasConfigSchema } from '../../../../types/config.js';
import { handleOpenSettings } from '../openSettings.js';

vi.mock('../utils/loadSettingsHtml.js', () => ({
  loadSettingsHtml: () =>
    "<html><script>window.s='__IMBAS_STATE__';</script></html>",
}));

const openBrowser = vi.hoisted(() => vi.fn());
vi.mock('@ogham/cross-platform/launcher', () => ({ openBrowser }));

const DEFAULT_CONFIG = ImbasConfigSchema.parse({});

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
    projectDir = mkdtempSync(join(tmpdir(), 'imbas-settings-'));
    const out = await handleOpenSettings({
      project_root: projectDir,
      wait_seconds: 1,
    });
    lastUrl = out.url;
    expect(out.status).toBe('pending');
    expect(out.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/\?token=/);
    expect(openBrowser).toHaveBeenCalledTimes(1);
  });

  it('serves injected bootstrap facts to the page', async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'imbas-settings-'));
    const out = await handleOpenSettings({
      project_root: projectDir,
      wait_seconds: 1,
      bootstrap: {
        providers: { jira: true, github: false },
        jira_projects: [{ key: 'KAN', name: 'Kanban' }],
      },
    });
    lastUrl = out.url;
    const html = await (await fetch(out.url)).text();
    expect(html).toContain('"KAN"');
    expect(html).toContain('"suggestedLocalKey"');
  });

  it('resolves saved and persists the submitted config to .imbas/config.json', async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'imbas-settings-'));
    const pending = await handleOpenSettings({
      project_root: projectDir,
      wait_seconds: 1,
    });
    lastUrl = pending.url;

    const waiting = handleOpenSettings({
      project_root: projectDir,
      wait_seconds: 10,
    });
    await new Promise((r) => setTimeout(r, 50));
    const submitted = {
      ...DEFAULT_CONFIG,
      provider: 'local' as const,
      defaults: { ...DEFAULT_CONFIG.defaults, project_ref: 'DEMO' },
    };
    const res = await fetch(saveUrl(pending.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: submitted,
        options: { provision_labels: false },
      }),
    });
    expect(res.status).toBe(200);

    const out = await waiting;
    expect(out.status).toBe('saved');
    expect(out.summary?.provider).toBe('local');
    expect(out.summary?.projectRef).toBe('DEMO');
    // Reuse must not respawn a browser tab.
    expect(openBrowser).toHaveBeenCalledTimes(1);

    const configPath = join(projectDir, '.imbas', 'config.json');
    expect(existsSync(configPath)).toBe(true);
    const written = JSON.parse(readFileSync(configPath, 'utf8')) as {
      provider: string;
    };
    expect(written.provider).toBe('local');
  });

  it('resolves closed when the page closes without saving', async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'imbas-settings-'));
    const pending = await handleOpenSettings({
      project_root: projectDir,
      wait_seconds: 1,
    });
    lastUrl = pending.url;

    const waiting = handleOpenSettings({
      project_root: projectDir,
      wait_seconds: 10,
    });
    await new Promise((r) => setTimeout(r, 50));
    await closeServer();

    const out = await waiting;
    expect(out.status).toBe('closed');
    expect(existsSync(join(projectDir, '.imbas', 'config.json'))).toBe(false);
  });
});
