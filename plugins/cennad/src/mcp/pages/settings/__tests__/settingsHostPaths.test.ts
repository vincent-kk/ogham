// filid:contract AC-active-home-host-matrix
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const packageRoot = resolve(import.meta.dirname, '..', '..', '..', '..', '..');
const renderFixture = join(
  import.meta.dirname,
  'fixtures',
  'settingsHostRender.fixture.ts',
);

let customHome: string | null = null;

function render(
  host: 'claude' | 'codex',
  override?: string,
): { activeHome?: unknown } {
  const env: NodeJS.ProcessEnv = { ...process.env, OGHAM_HOST: host };
  delete env.CLAUDE_CONFIG_DIR;
  delete env.CODEX_HOME;
  if (override) env.CENNAD_CONFIG_PATH = override;
  else delete env.CENNAD_CONFIG_PATH;

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', renderFixture],
    { cwd: packageRoot, env, encoding: 'utf8' },
  );
  if (result.status !== 0)
    throw new Error(
      `settings host render failed (${result.status ?? 'null'}): ${result.stderr}`,
    );
  return JSON.parse(result.stdout) as { activeHome?: unknown };
}

afterEach(() => {
  if (customHome) rmSync(customHome, { recursive: true, force: true });
  customHome = null;
});

describe('settings active home host matrix', () => {
  it.each([
    ['Claude', 'claude', '.claude'],
    ['Codex', 'codex', '.codex'],
  ] as const)('renders the real %s config resolver path', (_, host, root) => {
    expect(render(host).activeHome).toBe(
      join(homedir(), root, 'plugins', 'cennad'),
    );
  });

  it('renders a custom CENNAD_CONFIG_PATH as the active home', () => {
    customHome = mkdtempSync(join(tmpdir(), 'cennad-settings-home-'));
    expect(render('codex', customHome).activeHome).toBe(customHome);
  });
});
