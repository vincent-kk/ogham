import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type Page, expect, test } from '@playwright/test';

import { handleSettings } from '../src/mcp/tools/settings/index.js';

// The tool must not spawn a real tab, and rule-doc state comes from the plugin
// root (manifest + templates) the MCP host normally injects.
const PKG_ROOT = process.cwd();
process.env.OGHAM_NO_BROWSER = '1';
process.env.CLAUDE_PLUGIN_ROOT = PKG_ROOT;
// The page opens on the user layer when a project has no config. Isolate that
// layer so save tests never read or write the developer's real host config.
process.env.CLAUDE_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'seiri-e2e-state-'));

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
  const out = await handleSettings({
    action: 'open',
    project_root: dir,
    wait_seconds: 1,
  });
  if (out.action !== 'open') throw new Error('expected open output');
  expect(out.status).toBe('pending');
  activeUrl = out.url;
  return out.url;
}

async function longPoll(dir: string) {
  const out = await handleSettings({
    action: 'open',
    project_root: dir,
    wait_seconds: 20,
  });
  if (out.action !== 'open') throw new Error('expected open output');
  return out;
}

/**
 * Select the project layer used by assertions against repository files.
 *
 * @param page Settings page whose scope radio should change.
 * @returns Resolves after the rebuilt scope group reports project selected.
 */
async function useProjectScope(page: Page): Promise<void> {
  await page
    .locator('#config_scope .scope-option', { hasText: 'Project' })
    .click();
  await expect(
    page.locator('#config_scope input[value="project"]'),
  ).toBeChecked();
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
  // The intervention dial offers four positions, with skills-only selected.
  await expect(page.locator('#dial input[name="intervention"]')).toHaveCount(4);
  await expect(page.locator('#dial input[value="off"]')).toBeChecked();
  await expect(
    page.locator('#dial .dial-option').filter({ hasText: 'Skills only' }),
  ).toBeVisible();
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
  await useProjectScope(page);
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

test('saving the default skills-only mode persists intervention off', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await useProjectScope(page);
  await expect(page.locator('#dial input[value="off"]')).toBeChecked();
  await page.locator('#save').click();

  await expect(page.locator('#status')).toContainText('Saved');
  await expect(waiting).resolves.toMatchObject({ status: 'saved' });
  expect(readConfig(projectDir).intervention).toBe('off');
});

test('a drifted rule defaults to the latest shipped version', async ({
  page,
}) => {
  const rulesDir = join(projectDir, '.claude', 'rules');
  const deployed = join(rulesDir, RECOMMENDED.filename);
  const shipped = readFileSync(
    join(PKG_ROOT, 'templates', 'rules', RECOMMENDED.filename),
    'utf8',
  );
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(deployed, '# Locally edited rule\n', 'utf8');

  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);
  await page.goto(url);
  await useProjectScope(page);

  const rule = page
    .locator('#rules-list .rule')
    .filter({ has: page.locator(`#rule-${RECOMMENDED.id}`) });
  await expect(
    rule.locator('.rule-drift input[type="checkbox"]'),
  ).toBeChecked();
  await expect(
    page.locator('#preview .diff-row[data-action="update"]'),
  ).toContainText(RECOMMENDED.filename);

  await page.locator('#save').click();
  await expect(waiting).resolves.toMatchObject({ status: 'saved' });
  expect(readFileSync(deployed, 'utf8')).toBe(shipped);
});

test('a stale save replans without writing or settling the session', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  await page.goto(url);
  await useProjectScope(page);
  await expect(page.locator('#preview .diff-row').first()).toBeVisible();

  const rulesDir = join(projectDir, '.claude', 'rules');
  const deployed = join(rulesDir, RECOMMENDED.filename);
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(deployed, '# Newer user edit\n', 'utf8');

  const staleWait = handleSettings({
    action: 'open',
    project_root: projectDir,
    wait_seconds: 1,
  });
  await page.locator('#save').click();
  await expect(page.locator('#status')).toContainText('preview changed', {
    ignoreCase: true,
  });
  await expect(staleWait).resolves.toMatchObject({ status: 'pending' });
  expect(readFileSync(deployed, 'utf8')).toBe('# Newer user edit\n');

  await expect(
    page.locator('#preview .diff-row[data-action="drift"]'),
  ).toBeVisible();
  await expect(page.locator('#save')).toBeEnabled();

  const finalWait = longPoll(projectDir);
  await page.locator('#save').click();
  await expect(finalWait).resolves.toMatchObject({ status: 'saved' });
  expect(readFileSync(deployed, 'utf8')).toBe('# Newer user edit\n');
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
  const again = await handleSettings({
    action: 'open',
    project_root: projectDir,
    wait_seconds: 1,
  });
  if (again.action !== 'open') throw new Error('expected open output');
  expect(again.status).toBe('pending');
  expect(again.url).toBe(url);

  await page.goto(url);
  await expect(page.locator('#project-root')).toHaveText(projectDir);
});
