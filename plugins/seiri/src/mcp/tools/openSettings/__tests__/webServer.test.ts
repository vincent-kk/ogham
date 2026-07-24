import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyRuleDocs,
  planRuleDocs,
} from '../../../../core/ruleDocs/index.js';
import type { RuleDocSyncResult } from '../../../../types/manifest.js';
import type { SaveBody } from '../types/settingsTypes.js';
import {
  type SettingsServerInstance,
  startSettingsServer,
} from '../webServer/index.js';

const RULE_ID = 'seiri_probe';
const RULE_FILE = 'seiri_probe.md';
const RULE_BODY = '# Probe\n\nBody that gets hashed.\n';

let workspace: string;
let plugin: string;
let server: SettingsServerInstance;

function body(overrides: Partial<SaveBody['ruleDocs']> = {}): SaveBody {
  return {
    config: { intervention: 'advisory' },
    ruleDocs: { selections: { [RULE_ID]: true }, resync: [], ...overrides },
  };
}

function url(server: SettingsServerInstance, path: string): string {
  return `http://127.0.0.1:${server.port}${path}?token=${server.token}`;
}

interface SyncResponse {
  success: boolean;
  ruleDocs: RuleDocSyncResult;
}

async function post(path: string, payload: unknown): Promise<Response> {
  return fetch(url(server, path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: `http://127.0.0.1:${server.port}`,
    },
    body: JSON.stringify(payload),
  });
}

/** POST and read the body as the sync/plan envelope both endpoints return. */
async function postSync(path: string, payload: unknown): Promise<SyncResponse> {
  return (await post(path, payload)).json() as Promise<SyncResponse>;
}

beforeEach(async () => {
  workspace = mkdtempSync(join(tmpdir(), 'seiri-ws-'));
  plugin = mkdtempSync(join(tmpdir(), 'seiri-plugin-'));

  const templates = join(plugin, 'templates', 'rules');
  mkdirp(templates);
  writeFileSync(join(templates, RULE_FILE), RULE_BODY);
  writeFileSync(
    join(templates, 'manifest.json'),
    JSON.stringify({
      version: '1.0',
      rules: [
        {
          id: RULE_ID,
          filename: RULE_FILE,
          title: 'Probe',
          description: 'probe rule',
          templateHash: sha256(RULE_BODY),
        },
      ],
    }),
  );

  server = await startSettingsServer({
    settingsHtml: '<html><body>"__SEIRI_STATE__"</body></html>',
    loadState: () => ({
      projectRoot: workspace,
      configExists: false,
      config: { intervention: 'advisory' },
      ruleDocs: { entries: [], pluginRootResolved: true },
    }),
    planSave: (payload) =>
      planRuleDocs(workspace, plugin, selected(payload), {
        resync: payload.ruleDocs.resync,
      }),
    persistSave: (payload) => ({
      configWritten: true,
      ruleDocs: applyRuleDocs(workspace, plugin, selected(payload), {
        resync: payload.ruleDocs.resync,
      }),
    }),
  });
});

afterEach(async () => {
  await server.close();
  rmSync(workspace, { recursive: true, force: true });
  rmSync(plugin, { recursive: true, force: true });
});

describe('settings web server', () => {
  it('rejects a request without the one-time token', async () => {
    const response = await fetch(`http://127.0.0.1:${server.port}/`);
    expect(response.ok).toBe(false);
  });

  it('injects page state into the state placeholder', async () => {
    const html = await (await fetch(url(server, '/'))).text();
    expect(html).not.toContain('__SEIRI_STATE__');
    expect(html).toContain(workspace);
  });

  it('previews a deployment without writing anything', async () => {
    const data = await postSync('/plan', body());
    expect(data.ruleDocs.applied).toBe(false);
    expect(data.ruleDocs.outcomes[0]).toMatchObject({ action: 'copy' });
    expect(() => readFileSync(deployedPath(), 'utf8')).toThrow();
  });

  it('writes the rule on save, matching what the preview promised', async () => {
    const preview = await postSync('/plan', body());
    const saved = await postSync('/save', body());
    expect(saved.ruleDocs.applied).toBe(true);
    expect(saved.ruleDocs.outcomes.map((o) => o.action)).toEqual(
      preview.ruleDocs.outcomes.map((o) => o.action),
    );
    expect(readFileSync(deployedPath(), 'utf8')).toBe(RULE_BODY);
  });

  it('settles the long poll when the user saves', async () => {
    const settled = server.awaitSettled(5);
    await post('/save', body());
    await expect(settled).resolves.toMatchObject({ kind: 'saved' });
  });

  it('removes a deployed rule once it is deselected', async () => {
    await post('/save', body());
    await post('/save', body({ selections: { [RULE_ID]: false } }));
    expect(() => readFileSync(deployedPath(), 'utf8')).toThrow();
  });

  it('keeps local edits when drift is not resynced', async () => {
    await post('/save', body());
    writeFileSync(deployedPath(), '# Edited by hand\n');

    const data = await postSync('/save', body());
    expect(data.ruleDocs.outcomes[0]).toMatchObject({ action: 'drift' });
    expect(readFileSync(deployedPath(), 'utf8')).toBe('# Edited by hand\n');
  });

  it('overwrites local edits only when resync names the rule', async () => {
    await post('/save', body());
    writeFileSync(deployedPath(), '# Edited by hand\n');

    await post('/save', body({ resync: [RULE_ID] }));
    expect(readFileSync(deployedPath(), 'utf8')).toBe(RULE_BODY);
  });

  it('rejects a body the schema does not accept', async () => {
    const response = await post('/save', { config: { intervention: 'loud' } });
    expect(response.status).toBe(400);
    expect(() => readFileSync(deployedPath(), 'utf8')).toThrow();
  });

  it('settles waiters as closed when the page closes', async () => {
    const settled = server.awaitSettled(5);
    await post('/close', {});
    await expect(settled).resolves.toMatchObject({ kind: 'closed' });
  });
});

function deployedPath(): string {
  return join(workspace, '.claude', 'rules', RULE_FILE);
}

function selected(payload: SaveBody): string[] {
  return Object.entries(payload.ruleDocs.selections)
    .filter(([, on]) => on)
    .map(([id]) => id);
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function mkdirp(path: string): void {
  mkdirSync(path, { recursive: true });
}
