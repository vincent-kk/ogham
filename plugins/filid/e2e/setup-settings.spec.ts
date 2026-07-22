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

import { expect, test } from '@playwright/test';

import type { FilidConfig } from '../src/core/infra/configLoader/loaders/configSchemas.js';
import { handleOpenSettings } from '../src/mcp/tools/openSettings/index.js';

// The tool must not spawn real browser tabs, and rule-doc management needs the
// plugin root (manifest + templates) that the MCP host normally injects.
const PKG_ROOT = process.cwd();
process.env.OGHAM_NO_BROWSER = '1';
process.env.CLAUDE_PLUGIN_ROOT = PKG_ROOT;

const TEMPLATES = join(PKG_ROOT, 'templates', 'rules');

let projectDir: string;
let activeUrl: string | null = null;

function template(name: string): string {
  return readFileSync(join(TEMPLATES, name), 'utf8');
}

/** Start a settings session: a 1s call surfaces the URL (pending), leaving the
 *  server running so the test can attach a browser and a real long-poll. */
async function openSession(dir: string): Promise<string> {
  const out = await handleOpenSettings({ path: dir, waitSeconds: 1 });
  expect(out.status).toBe('pending');
  activeUrl = out.url;
  return out.url;
}

function longPoll(dir: string) {
  return handleOpenSettings({ path: dir, waitSeconds: 20 });
}

function readConfig(dir: string): FilidConfig {
  return JSON.parse(
    readFileSync(join(dir, '.filid', 'config.json'), 'utf8'),
  ) as FilidConfig;
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
  projectDir = mkdtempSync(join(tmpdir(), 'filid-e2e-'));
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
  await expect(page.locator('.brand-name')).toHaveText('filid');
  await expect(page.locator('#project-chip')).toHaveText(projectDir);
  // Fresh project: no config yet — the page must say saving will create it.
  await expect(page.locator('#init-note')).toBeVisible();
  // All 8 built-in rules render as editable rows.
  await expect(page.locator('#rules-list .ruleitem')).toHaveCount(8);
  await expect(page.locator('#rule-docs-required .docrow')).toHaveCount(1);
  await expect(page.locator('#rule-docs-optional .docrow')).toHaveCount(4);
});

test('full save round-trip persists every edited config field to disk', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await page.locator('#rule-naming-convention-enabled').uncheck();
  await page
    .locator('[data-rule-severity="max-depth"]')
    .selectOption('warning');
  const exemptRow = page.locator('.ruleitem', {
    has: page.locator('[data-rule-exempt="zero-peer-file"]'),
  });
  await exemptRow.locator('summary').click();
  await page
    .locator('[data-rule-exempt="zero-peer-file"]')
    .fill('src/legacy/**');

  await page.locator('#language').fill('Korean');
  await page.locator('#max-depth').fill('7');

  await page.getByText('Structure exceptions').click();
  await page
    .locator('#additional-allowed')
    .fill('notes.md\n{"basename": "cli.ts", "paths": ["src/**"]}');
  await page.locator('#additional-entry-points').fill('page.tsx');

  await page.getByRole('button', { name: 'Save & Close' }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await waiting;
  expect(out.status).toBe('saved');
  expect(out.summary?.configWritten).toBe(true);

  const config = readConfig(projectDir);
  expect(config.rules['naming-convention'].enabled).toBe(false);
  expect(config.rules['max-depth'].severity).toBe('warning');
  expect(config.rules['zero-peer-file'].exempt).toEqual(['src/legacy/**']);
  expect(config.language).toBe('Korean');
  expect(config.scan?.maxDepth).toBe(7);
  expect(config['additional-allowed']).toEqual([
    'notes.md',
    { basename: 'cli.ts', paths: ['src/**'] },
  ]);
  expect(config['additional-entry-points']).toEqual(['page.tsx']);
});

test('plain Save settles the long-poll (window stays open)', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await page.locator('#max-depth').fill('7');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  // Plain "Save" applies the change and settles the long-poll (Claude resumes),
  // differing from "Save & Close" only by not closing the window.
  const out = await waiting;
  expect(out.status).toBe('saved');
  expect(readConfig(projectDir).scan?.maxDepth).toBe(7);
});

test('rule docs render deployment state and the save syncs .claude/rules', async ({
  page,
}) => {
  // Fixture: reuse-first deployed in sync, test-validity deployed with a local
  // edit (drift), the other two optional docs not deployed.
  const rulesDir = join(projectDir, '.claude', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(
    join(rulesDir, 'filid_reuse-first.md'),
    template('filid_reuse-first.md'),
  );
  writeFileSync(
    join(rulesDir, 'filid_test-validity.md'),
    template('filid_test-validity.md') + '\n<!-- local edit -->\n',
  );

  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await expect(page.locator('#doc-filid_reuse-first')).toBeChecked();
  await expect(page.locator('#doc-filid_test-validity')).toBeChecked();
  await expect(
    page.locator('#doc-filid_cognitive-discipline'),
  ).not.toBeChecked();
  await expect(
    page.getByText('UPDATE AVAILABLE', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('REQUIRED', { exact: true })).toBeVisible();

  // Remove reuse-first, accept the newer template for test-validity, newly
  // apply cognitive-discipline, leave context-efficiency off.
  await page.locator('#doc-filid_reuse-first').uncheck();
  await page.locator('[data-resync-id="filid_test-validity"]').check();
  await page.locator('#doc-filid_cognitive-discipline').check();

  await page.getByRole('button', { name: 'Save & Close' }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await waiting;
  expect(out.status).toBe('saved');
  // syncRuleDocs reports filenames (not rule ids) in every result array.
  const sync = out.summary!.ruleDocs;
  expect(sync.removed).toEqual(['filid_reuse-first.md']);
  expect(sync.updated).toEqual(['filid_test-validity.md']);
  expect(sync.copied.sort()).toEqual([
    'filid_cognitive-discipline.md',
    'filid_fca-policy.md',
  ]);
  expect(sync.drift).toEqual([]);

  expect(existsSync(join(rulesDir, 'filid_reuse-first.md'))).toBe(false);
  expect(existsSync(join(rulesDir, 'filid_cognitive-discipline.md'))).toBe(
    true,
  );
  expect(existsSync(join(rulesDir, 'filid_fca-policy.md'))).toBe(true);
  expect(existsSync(join(rulesDir, 'filid_context-efficiency.md'))).toBe(false);
  // Overwrite opt-in replaced the local edit with the shipped template.
  expect(readFileSync(join(rulesDir, 'filid_test-validity.md'), 'utf8')).toBe(
    template('filid_test-validity.md'),
  );
});

test('keeping the overwrite box unchecked preserves local edits and reports drift', async ({
  page,
}) => {
  const rulesDir = join(projectDir, '.claude', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  const edited = template('filid_test-validity.md') + '\n<!-- local edit -->\n';
  writeFileSync(join(rulesDir, 'filid_test-validity.md'), edited);

  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await expect(page.locator('#doc-filid_test-validity')).toBeChecked();
  await page.getByRole('button', { name: 'Save & Close' }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await waiting;
  expect(out.status).toBe('saved');
  expect(out.summary!.ruleDocs.drift).toEqual(['filid_test-validity.md']);
  expect(out.summary!.ruleDocs.updated).toEqual([]);
  expect(readFileSync(join(rulesDir, 'filid_test-validity.md'), 'utf8')).toBe(
    edited,
  );
});

test('client validation blocks the save and recovers after the fix', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await page.getByText('Structure exceptions').click();
  await page.locator('#additional-allowed').fill('{not valid json');
  await page.getByRole('button', { name: 'Save & Close' }).click();

  await expect(
    page.locator('[data-error-for="additional-allowed"]'),
  ).toBeVisible();
  await expect(page.locator('#status')).toContainText('Fix the highlighted');
  // Nothing was persisted by the rejected submit.
  expect(existsSync(join(projectDir, '.filid', 'config.json'))).toBe(false);

  await page.locator('#additional-allowed').fill('notes.md');
  await page.getByRole('button', { name: 'Save & Close' }).click();
  await expect(page.locator('#status')).toContainText('Saved');

  const out = await waiting;
  expect(out.status).toBe('saved');
  expect(readConfig(projectDir)['additional-allowed']).toEqual(['notes.md']);
});

test('close without saving resolves closed and leaves no config behind', async ({
  page,
}) => {
  const url = await openSession(projectDir);
  const waiting = longPoll(projectDir);

  await page.goto(url);
  await page.getByRole('button', { name: 'Cancel' }).click();

  const out = await waiting;
  expect(out.status).toBe('closed');
  expect(existsSync(join(projectDir, '.filid', 'config.json'))).toBe(false);
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
  await expect(page.locator('.brand-name')).toHaveText('filid');
});
