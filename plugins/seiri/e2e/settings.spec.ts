import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { handleOpenSettings } from '../src/mcp/tools/openSettings/index.js';

// The tool must not spawn a real tab, and rule-doc state comes from the plugin
// root (manifest + templates) the MCP host normally injects.
const PKG_ROOT = process.cwd();
process.env.SEIRI_NO_BROWSER = '1';
process.env.CLAUDE_PLUGIN_ROOT = PKG_ROOT;

// Drive assertions off the shipped manifest, not hard-coded ids/counts.
interface ManifestEntry {
  id: string;
  filename: string;
  recommended?: boolean;
}
const MANIFEST = JSON.parse(
  readFileSync(join(PKG_ROOT, 'templates', 'rules', 'manifest.json'), 'utf8'),
) as { rules: ManifestEntry[] };
const RULE_COUNT = MANIFEST.rules.length;
const RECOMMENDED = MANIFEST.rules.find((r) => r.recommended);
if (!RECOMMENDED) throw new Error('manifest must declare a recommended rule');

let projectDir: string;
let activeUrl: string | null = null;

/** Start a session: a 1s call surfaces the URL (pending), leaving the server
 *  running so the test can attach a browser and a real long-poll. */
async function openSession(dir: string): Promise<string> {
  const out = await handleOpenSettings({ path: dir, waitSeconds: 1 });
  expect(out.status).toBe('pending');
  activeUrl = out.url;
  return out.url;
}

function longPoll(dir: string) {
  return handleOpenSettings({ path: dir, waitSeconds: 20 });
}

function readConfig(dir: string): { intervention?: string } {
  return JSON.parse(
    readFileSync(join(dir, '.seiri', 'config.json'), 'utf8'),
  ) as { intervention?: string };
}

async function closeActiveServer(): Promise<void> {
  if (!activeUrl) return;
  const parsed = new URL(activeUrl);
  await fetch(
    `${parsed.origin}/close?token=${parsed.searchParams.get('token')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: parsed.origin },
      body: '{}',
    },
  ).catch(() => undefined);
  activeUrl = null;
}

test.beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'seiri-e2e-'));
});

test.afterEach(async () => {
  await closeActiveServer();
  rmSync(projectDir, { recursive: true, force: true });
});

test('serves the built page with injected state and rejects a missing token', async ({
  page,
}) => {
  const url = await openSession(projectDir);

  // Token gate: the bare origin (no token) must not serve the form.
  const bare = await page.request.get(new URL(url).origin + '/');
  expect(bare.status()).toBe(401);

  await page.goto(url);
  await expect(page.locator('#project-root')).toHaveText(projectDir);
  // Every shipped rule renders one selectable card.
  await expect(page.locator('#rules-list .rule')).toHaveCount(RULE_COUNT);
  // The intervention dial offers its three positions.
  await expect(page.locator('#dial input[name="intervention"]')).toHaveCount(3);
  // A fresh project pre-checks the recommended set, so the plan is non-empty.
  await expect(page.locator('#preview .diff-row').first()).toBeVisible();
});

test('the pending-changes preview reacts to a selection change', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  await page.goto(url);

  // Recommended rules are pre-checked, so the plan copies them.
  await expect(page.locator('#preview .diff-row').first()).toBeVisible();

  // Uncheck every rule → the plan would do nothing.
  for (const box of await page.locator('#rules-list input[id^="rule-"]').all())
    await box.uncheck();

  await expect(page.locator('#preview .empty')).toHaveText(
    'Nothing would change.',
  );
});

test('save persists the dial and syncs the selected rule docs', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  // Move the dial off its default; keep the recommended rule checked.
  await page.locator('#dial input[value="strict"]').check();
  await page.locator(`#rule-${RECOMMENDED.id}`).check();

  // Plain Save keeps the window open (no window.close race), and still
  // settles the long-poll below.
  await page.locator('#save').click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await waiting;
  expect(out.status).toBe('saved');

  expect(readConfig(projectDir).intervention).toBe('strict');
  expect(
    existsSync(join(projectDir, '.claude', 'rules', RECOMMENDED.filename)),
  ).toBe(true);
});

test('close without saving resolves closed and leaves no config', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await page.locator('#close').click();

  const out = await waiting;
  expect(out.status).toBe('closed');
  expect(existsSync(join(projectDir, '.seiri', 'config.json'))).toBe(false);
  activeUrl = null;
});

test('a pending call reuses the running session and keeps the same URL', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const again = await handleOpenSettings({ path: projectDir, waitSeconds: 1 });
  expect(again.status).toBe('pending');
  expect(again.url).toBe(url);

  await page.goto(url);
  await expect(page.locator('#project-root')).toHaveText(projectDir);
});
