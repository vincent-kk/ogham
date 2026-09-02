/**
 * @file craftLibrary.test.ts
 * @description craft-library와 동적 manage-library를 임시 vault에서 실행해 scaffold,
 * bounded HTML inspection, article pair CRUD, metadata-only catalog search, 실패 시
 * 보존 경계를 검증한다.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const PACKAGE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);
const CRAFT_SCRIPT = join(
  PACKAGE_ROOT,
  'skills/craft-library/scripts/craft-library.mjs',
);
const MANAGER_REL = '.agents/skills/manage-library/scripts/manage-library.mjs';

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runScript(script: string, args: string[], cwd: string): RunResult {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf-8',
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function lastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1]!) as Record<string, unknown>;
}

describe('craft-library and installed manage-library', () => {
  let vault: string;
  let source: string;

  beforeEach(() => {
    vault = mkdtempSync(join(tmpdir(), 'maencof-library-'));
    source = join(vault, 'external.html');
    writeFileSync(
      source,
      '<!doctype html><title>External guide</title><h1>Guide</h1><p>bodytoken</p>',
      'utf-8',
    );
  });

  afterEach(() => {
    rmSync(vault, { recursive: true, force: true });
  });

  it.each([
    ['codex', '.agents/skills/manage-library/SKILL.md'],
    ['claude', '.claude/skills/manage-library/SKILL.md'],
  ])('scaffolds the library and installs the %s local skill', (host, skill) => {
    const result = runScript(CRAFT_SCRIPT, [vault, '--host', host], vault);

    expect(result.status, result.stderr).toBe(0);
    for (const path of [
      'library/index.html',
      'library/articles',
      'library/styles/index.css',
      'library/scripts/index.js',
      'library/scripts/catalog.generated.js',
      'library/assets',
      skill,
    ])
      expect(existsSync(join(vault, path)), path).toBe(true);
    expect(lastJson(result.stdout)).toMatchObject({
      host,
      operation: 'created',
    });
  });

  it('uses the working directory when the vault argument is omitted', () => {
    const result = runScript(CRAFT_SCRIPT, ['--host', 'codex'], vault);

    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(vault, 'library/index.html'))).toBe(true);
    expect(lastJson(result.stdout)).toMatchObject({
      host: 'codex',
      operation: 'created',
    });
  });

  it('refreshes its generated local skill without replacing library content', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    const stylesheet = join(vault, 'library/styles/index.css');
    const article = join(vault, 'library/articles/kept.html');
    const managerSkill = join(vault, '.agents/skills/manage-library/SKILL.md');
    writeFileSync(stylesheet, 'custom{}\n', 'utf-8');
    writeFileSync(article, '<!doctype html><title>Keep me</title>', 'utf-8');
    writeFileSync(
      managerSkill,
      '<!-- managed by maencof craft-library -->\n# stale\n',
      'utf-8',
    );

    const result = runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault);

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(stylesheet, 'utf-8')).toBe('custom{}\n');
    expect(readFileSync(article, 'utf-8')).toContain('Keep me');
    expect(readFileSync(managerSkill, 'utf-8')).toContain('# manage-library');
    expect(
      existsSync(
        join(vault, '.agents/skills/manage-library/manage-library/SKILL.md'),
      ),
    ).toBe(false);
  });

  it('preserves vault-owned styles when another host installs its local skill', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    writeFileSync(
      join(vault, 'library/styles/index.css'),
      'custom{}\n',
      'utf-8',
    );

    const result = runScript(CRAFT_SCRIPT, [vault, '--host', 'claude'], vault);

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(vault, 'library/styles/index.css'), 'utf-8')).toBe(
      'custom{}\n',
    );
    expect(
      existsSync(join(vault, '.agents/skills/manage-library/SKILL.md')),
    ).toBe(true);
    expect(
      existsSync(join(vault, '.claude/skills/manage-library/SKILL.md')),
    ).toBe(true);
  });

  it('stops before scaffold writes when the local skill path is occupied', () => {
    const occupied = join(vault, '.agents/skills/manage-library/SKILL.md');
    mkdirSync(dirname(occupied), { recursive: true });
    writeFileSync(occupied, 'user owned\n', 'utf-8');

    const result = runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault);

    expect(result.status).toBe(2);
    expect(readFileSync(occupied, 'utf-8')).toBe('user owned\n');
    expect(existsSync(join(vault, 'library/index.html'))).toBe(false);
  });

  it('inspects only bounded structural HTML metadata', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    writeFileSync(
      source,
      `<!doctype html><head><title>Roadmap</title><meta name="description" content="Short summary"><meta name="keywords" content="alpha, beta"></head><body><h1>Agent guide</h1><p>${'SECRET-BODY '.repeat(20_000)}</p></body>`,
      'utf-8',
    );

    const result = runScript(
      join(vault, MANAGER_REL),
      ['inspect', '--source', source],
      vault,
    );
    const output = lastJson(result.stdout);

    expect(result.status, result.stderr).toBe(0);
    expect(output).toMatchObject({
      title: 'Roadmap',
      description: 'Short summary',
      keywords: ['alpha', 'beta'],
      headings: ['Agent guide'],
    });
    expect(JSON.stringify(output).length).toBeLessThanOrEqual(4096);
    expect(JSON.stringify(output)).not.toContain('SECRET-BODY');

    const slashes = '\\'.repeat(120);
    writeFileSync(
      source,
      `<title>${slashes.repeat(2)}</title><meta name="description" content="${slashes.repeat(6)}"><meta name="keywords" content="${Array(16).fill(slashes.slice(0, 60)).join(',')}">${Array(10).fill(`<h1>${slashes}</h1>`).join('')}`,
      'utf-8',
    );
    const adversarial = lastJson(
      runScript(
        join(vault, MANAGER_REL),
        ['inspect', '--source', source],
        vault,
      ).stdout,
    );
    expect(JSON.stringify(adversarial).length).toBeLessThanOrEqual(4096);
  });

  it('adds an article pair and rebuilds a deterministic catalog', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    const original = readFileSync(source, 'utf-8');
    const result = runScript(
      join(vault, MANAGER_REL),
      [
        'add',
        '--source',
        source,
        '--article',
        'research/agent-guide.html',
        '--name',
        'Agent Guide',
        '--created-at',
        '2026-09-02T00:00:00.000Z',
        '--tag',
        'research',
        '--tag',
        'agents',
        '--search-term',
        '에이전트 설계',
      ],
      vault,
    );

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(source, 'utf-8')).toBe(original);
    expect(
      JSON.parse(
        readFileSync(
          join(vault, 'library/articles/research/agent-guide.json'),
          'utf-8',
        ),
      ),
    ).toEqual({
      schemaVersion: 1,
      name: 'Agent Guide',
      createdAt: '2026-09-02T00:00:00.000Z',
      tags: ['research', 'agents'],
      searchTerms: ['에이전트 설계'],
    });
    const context: Record<string, unknown> = {};
    runInNewContext(
      readFileSync(
        join(vault, 'library/scripts/catalog.generated.js'),
        'utf-8',
      ),
      context,
    );
    expect(context.MAENCOF_LIBRARY_CATALOG).toEqual([
      {
        path: 'research/agent-guide.html',
        href: 'articles/research/agent-guide.html',
        group: 'research',
        name: 'Agent Guide',
        createdAt: '2026-09-02T00:00:00.000Z',
        tags: ['research', 'agents'],
        searchTerms: ['에이전트 설계'],
      },
    ]);
    expect(lastJson(result.stdout)).toMatchObject({
      articlePath: 'library/articles/research/agent-guide.html',
      markdownLink: '[Agent Guide](library/articles/research/agent-guide.html)',
    });
  });

  it('searches catalog metadata but never article body text', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    expect(
      runScript(
        join(vault, MANAGER_REL),
        [
          'add',
          '--source',
          source,
          '--article',
          'guides/external.html',
          '--name',
          'External Guide',
          '--tag',
          'reference',
          '--search-term',
          'agent handbook',
        ],
        vault,
      ).status,
    ).toBe(0);
    const context: Record<string, unknown> = {};
    for (const script of ['catalog.generated.js', 'filter-catalog.js'])
      runInNewContext(
        readFileSync(join(vault, 'library/scripts', script), 'utf-8'),
        context,
      );
    const filter = context.MAENCOF_FILTER_LIBRARY as (
      entries: unknown[],
      query: string,
    ) => unknown[];
    const catalog = context.MAENCOF_LIBRARY_CATALOG as unknown[];

    expect(filter(catalog, 'external reference')).toHaveLength(1);
    expect(filter(catalog, 'agent handbook')).toHaveLength(1);
    expect(filter(catalog, 'bodytoken')).toEqual([]);
  });

  it('updates HTML and metadata while preserving creation time', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    const manager = join(vault, MANAGER_REL);
    expect(
      runScript(
        manager,
        [
          'add',
          '--source',
          source,
          '--article',
          'guide.html',
          '--name',
          'Old',
          '--created-at',
          '2026-01-01T00:00:00.000Z',
          '--tag',
          'old',
        ],
        vault,
      ).status,
    ).toBe(0);
    const replacement = join(vault, 'replacement.html');
    writeFileSync(replacement, '<!doctype html><title>New</title>', 'utf-8');

    const result = runScript(
      manager,
      [
        'update',
        '--article',
        'guide.html',
        '--source',
        replacement,
        '--name',
        'New',
        '--clear-tags',
        '--search-term',
        'revised',
      ],
      vault,
    );
    const metadata = JSON.parse(
      readFileSync(join(vault, 'library/articles/guide.json'), 'utf-8'),
    ) as Record<string, unknown>;

    expect(result.status, result.stderr).toBe(0);
    expect(metadata).toMatchObject({
      name: 'New',
      createdAt: '2026-01-01T00:00:00.000Z',
      tags: [],
      searchTerms: ['revised'],
    });
    expect(
      readFileSync(join(vault, 'library/articles/guide.html'), 'utf-8'),
    ).toBe('<!doctype html><title>New</title>');
    expect(existsSync(replacement)).toBe(true);
  });

  it('moves and removes the exact article pair', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    const manager = join(vault, MANAGER_REL);
    expect(
      runScript(
        manager,
        [
          'add',
          '--source',
          source,
          '--article',
          'draft.html',
          '--name',
          'Draft',
        ],
        vault,
      ).status,
    ).toBe(0);

    const moved = runScript(
      manager,
      ['move', '--article', 'draft.html', '--to', 'finished/draft.html'],
      vault,
    );
    expect(moved.status, moved.stderr).toBe(0);
    expect(existsSync(join(vault, 'library/articles/draft.html'))).toBe(false);
    expect(
      existsSync(join(vault, 'library/articles/finished/draft.json')),
    ).toBe(true);
    expect(lastJson(moved.stdout)).toMatchObject({
      articlePath: 'library/articles/finished/draft.html',
    });

    const refused = runScript(
      manager,
      ['remove', '--article', 'finished/draft.html'],
      vault,
    );
    expect(refused.status).toBe(2);
    expect(
      existsSync(join(vault, 'library/articles/finished/draft.html')),
    ).toBe(true);

    const removed = runScript(
      manager,
      ['remove', '--article', 'finished/draft.html', '--yes'],
      vault,
    );
    expect(removed.status, removed.stderr).toBe(0);
    expect(
      existsSync(join(vault, 'library/articles/finished/draft.html')),
    ).toBe(false);
    expect(
      existsSync(join(vault, 'library/articles/finished/draft.json')),
    ).toBe(false);
  });

  it('preserves the catalog when sync finds an orphan sidecar', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    const manager = join(vault, MANAGER_REL);
    expect(
      runScript(
        manager,
        [
          'add',
          '--source',
          source,
          '--article',
          'valid.html',
          '--name',
          'Valid',
        ],
        vault,
      ).status,
    ).toBe(0);
    const catalogPath = join(vault, 'library/scripts/catalog.generated.js');
    const before = readFileSync(catalogPath, 'utf-8');
    writeFileSync(
      join(vault, 'library/articles/orphan.json'),
      JSON.stringify({
        schemaVersion: 1,
        name: 'Orphan',
        createdAt: '2026-09-02T00:00:00.000Z',
        tags: [],
        searchTerms: [],
      }),
      'utf-8',
    );

    const result = runScript(manager, ['sync'], vault);

    expect(result.status).toBe(2);
    expect(readFileSync(catalogPath, 'utf-8')).toBe(before);
  });

  it('rejects traversal without writing outside articles', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);

    const result = runScript(
      join(vault, MANAGER_REL),
      [
        'add',
        '--source',
        source,
        '--article',
        '../escape.html',
        '--name',
        'Escape',
      ],
      vault,
    );

    expect(result.status).toBe(2);
    expect(existsSync(join(vault, 'library/escape.html'))).toBe(false);
  });

  it('verifies catalog drift and lets sync rebuild from canonical sidecars', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    const manager = join(vault, MANAGER_REL);
    expect(
      runScript(
        manager,
        [
          'add',
          '--source',
          source,
          '--article',
          'reference.html',
          '--name',
          'Reference',
        ],
        vault,
      ).status,
    ).toBe(0);
    expect(
      lastJson(runScript(manager, ['verify'], vault).stdout),
    ).toMatchObject({
      operation: 'verified',
      articleCount: 1,
      synchronized: true,
    });
    const metadataPath = join(vault, 'library/articles/reference.json');
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as Record<
      string,
      unknown
    >;
    writeFileSync(
      metadataPath,
      `${JSON.stringify({ ...metadata, name: 'Canonical name' }, null, 2)}\n`,
      'utf-8',
    );

    expect(runScript(manager, ['verify'], vault).status).toBe(2);
    expect(runScript(manager, ['sync'], vault).status).toBe(0);
    expect(runScript(manager, ['verify'], vault).status).toBe(0);
  });

  it('keeps the static index file-compatible and free of runtime fetches', () => {
    expect(
      runScript(CRAFT_SCRIPT, [vault, '--host', 'codex'], vault).status,
    ).toBe(0);
    const index = readFileSync(join(vault, 'library/index.html'), 'utf-8');
    const scripts = ['index.js', 'filter-catalog.js', 'render-library.js']
      .map((file) =>
        readFileSync(join(vault, 'library/scripts', file), 'utf-8'),
      )
      .join('\n');

    expect(index).toContain('scripts/catalog.generated.js');
    expect(index).toContain('scripts/filter-catalog.js');
    expect(index).toContain('scripts/render-library.js');
    expect(index).toContain('scripts/index.js');
    expect(scripts).not.toContain('fetch(');
  });
});
