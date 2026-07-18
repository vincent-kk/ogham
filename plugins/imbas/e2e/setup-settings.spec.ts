import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { expect, test } from '@playwright/test';

import { handleOpenSettings } from '../src/mcp/tools/openSettings/openSettings.js';
import type { ImbasConfig } from '../src/types/config.js';
import type { SettingsBootstrap } from '../src/types/settings.js';

// The tool must not spawn real browser tabs during e2e runs.
process.env.IMBAS_NO_BROWSER = '1';

const BOOTSTRAP: SettingsBootstrap = {
  providers: { jira: true, github: false },
  jira_projects: [
    { key: 'KAN', name: 'Kanban' },
    { key: 'DEMO', name: 'Demo Project' },
  ],
  github_repo: 'acme/app',
};

let projectDir: string;
let activeUrl: string | null = null;

/** Start a settings session: a 1s call surfaces the URL (pending), leaving the
 *  server running so the test can attach a browser and a real long-poll. */
async function openSession(
  dir: string,
  bootstrap: SettingsBootstrap = BOOTSTRAP,
): Promise<string> {
  const out = await handleOpenSettings({
    project_root: dir,
    wait_seconds: 1,
    bootstrap,
  });
  expect(out.status).toBe('pending');
  activeUrl = out.url;
  return out.url;
}

function longPoll(dir: string) {
  return handleOpenSettings({ project_root: dir, wait_seconds: 20 });
}

function readConfig(dir: string): ImbasConfig {
  return JSON.parse(
    readFileSync(join(dir, '.imbas', 'config.json'), 'utf8'),
  ) as ImbasConfig;
}

async function closeActiveServer(): Promise<void> {
  if (!activeUrl) return;
  const parsed = new URL(activeUrl);
  await fetch(
    `${parsed.origin}/close?token=${parsed.searchParams.get('token')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  ).catch(() => undefined);
  activeUrl = null;
}

test.beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'imbas-e2e-'));
});

test.afterEach(async () => {
  await closeActiveServer();
  rmSync(projectDir, { recursive: true, force: true });
});

test('serves the built page with bootstrap facts and rejects a missing token', async ({
  page,
}) => {
  const url = await openSession(projectDir);

  const bare = await page.request.get(new URL(url).origin + '/');
  expect(bare.status()).toBe(401);

  await page.goto(url);
  await expect(page.locator('.brand-name')).toHaveText('imbas');
  await expect(page.locator('#project-chip')).toHaveText(projectDir);
  await expect(page.locator('#init-note')).toBeVisible();

  // Bootstrap-driven availability hints on the provider chips.
  await expect(page.locator('[data-provider-hint="jira"]')).toHaveText(
    'detected',
  );
  await expect(page.locator('[data-provider-hint="github"]')).toHaveText(
    'not detected',
  );
  await expect(page.locator('[data-provider-hint="local"]')).toHaveText(
    'always available',
  );

  // Jira project picker is populated from the injected list.
  await expect(page.locator('#jira-project-select option')).toHaveCount(3);

  // Local key suggestion mirrors the sanitized project directory name.
  const suggested = basename(projectDir)
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  await page.locator('.provider-row', { hasText: 'local' }).click();
  await expect(page.locator('#local-key')).toHaveValue(suggested);
});

test('jira flow: picking a project from the select persists the config', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  // Default provider is jira; the picker syncs the key input.
  await page.locator('#jira-project-select').selectOption('KAN');
  await expect(page.locator('#jira-project-key')).toHaveValue('KAN');

  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await waiting;
  expect(out.status).toBe('saved');
  expect(out.summary).toMatchObject({
    provider: 'jira',
    projectRef: 'KAN',
    provisionLabels: false,
  });

  const config = readConfig(projectDir);
  expect(config.provider).toBe('jira');
  expect(config.defaults.project_ref).toBe('KAN');
  expect(config.jira.issue_types.story).toBe('Story');
});

test('github flow: repo prefill, label/limit edits, and provision intent', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await page.locator('.provider-row', { hasText: 'github' }).click();
  // Repo prefilled from the bootstrap-detected remote.
  await expect(page.locator('#github-repo')).toHaveValue('acme/app');

  await page.getByText('Lifecycle labels', { exact: true }).click();
  await page.locator('#label-managed').fill('imbas');
  await page.locator('#provision-labels').check();

  await page.getByText('Defaults', { exact: true }).click();
  await page.locator('#limit-max_lines').fill('150');
  await page.locator('#model-devplan').fill('sonnet');

  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await waiting;
  expect(out.status).toBe('saved');
  expect(out.summary).toMatchObject({
    provider: 'github',
    projectRef: 'acme/app',
    provisionLabels: true,
  });

  const config = readConfig(projectDir);
  expect(config.provider).toBe('github');
  expect(config.defaults.project_ref).toBe('acme/app');
  expect(config.github?.repo).toBe('acme/app');
  expect(config.github?.linkTypes).toEqual([
    'blocks',
    'blocked-by',
    'split-from',
    'split-into',
    'relates',
  ]);
  expect(config.labels.managed).toBe('imbas');
  expect(config.defaults.subtask_limits.max_lines).toBe(150);
  expect(config.defaults.llm_model.devplan).toBe('sonnet');
});

test('client validation blocks a malformed repo and recovers after the fix', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await page.locator('.provider-row', { hasText: 'github' }).click();
  await page.locator('#github-repo').fill('not-a-repo');
  await page.getByRole('button', { name: 'Save settings' }).click();

  await expect(page.locator('[data-error-for="github-repo"]')).toBeVisible();
  await expect(page.locator('#status')).toContainText('Fix the highlighted');
  expect(existsSync(join(projectDir, '.imbas', 'config.json'))).toBe(false);

  await page.locator('#github-repo').fill('acme/app');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await waiting;
  expect(out.status).toBe('saved');
  expect(readConfig(projectDir).github?.repo).toBe('acme/app');
});

test('switching provider preserves the previously saved github section', async ({
  page,
}) => {
  const url = await openSession(projectDir);

  // First save: github.
  const first = longPoll(projectDir);
  await page.goto(url);
  await page.locator('.provider-row', { hasText: 'github' }).click();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#status')).toContainText('Saved');
  expect((await first).status).toBe('saved');

  // Second save on the same session: reload shows the saved provider, then
  // switch to local — the github section must survive the switch.
  const second = longPoll(projectDir);
  await page.goto(url);
  await expect(page.locator('#init-note')).toBeHidden();
  await expect(
    page.locator('input[name="provider"][value="github"]'),
  ).toBeChecked();
  await page.locator('.provider-row', { hasText: 'local' }).click();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await second;
  expect(out.status).toBe('saved');
  expect(out.summary?.provider).toBe('local');

  const config = readConfig(projectDir);
  expect(config.provider).toBe('local');
  expect(config.github?.repo).toBe('acme/app');
});

test('close without saving resolves closed and leaves no config behind', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await page.getByRole('button', { name: 'Close without saving' }).click();

  const out = await waiting;
  expect(out.status).toBe('closed');
  expect(existsSync(join(projectDir, '.imbas', 'config.json'))).toBe(false);
  activeUrl = null;
});

test('a pending call reuses the running session and keeps the same URL', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const again = await handleOpenSettings({
    project_root: projectDir,
    wait_seconds: 1,
  });
  expect(again.status).toBe('pending');
  expect(again.url).toBe(url);

  await page.goto(url);
  await expect(page.locator('.brand-name')).toHaveText('imbas');
});
