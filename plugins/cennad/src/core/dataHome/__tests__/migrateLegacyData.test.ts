import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { migrateLegacyData } from '../operations/migrateLegacyData.js';

describe('migrateLegacyData', () => {
  let root: string;
  let legacyHome: string;
  let dataHome: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cennad-data-migration-'));
    legacyHome = join(root, 'legacy');
    dataHome = join(root, 'data');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('copies persistent legacy data without carrying ephemeral runtime state', async () => {
    await mkdir(join(legacyHome, 'sessions', 'project'), { recursive: true });
    await mkdir(join(legacyHome, 'runtime', 'antigravity-cwd', 'sid'), {
      recursive: true,
    });
    await writeFile(join(legacyHome, 'config.json'), '{"saved":true}');
    await writeFile(
      join(legacyHome, 'sessions', 'project', 'sid.json'),
      '{"session":true}',
    );
    await writeFile(
      join(legacyHome, 'runtime', 'antigravity-cwd', 'sid', 'state'),
      'agy',
    );
    await writeFile(join(legacyHome, 'runtime', 'counter.json'), 'ephemeral');

    await expect(migrateLegacyData({ legacyHome, dataHome })).resolves.toBe(
      true,
    );
    await expect(readFile(join(dataHome, 'config.json'), 'utf8')).resolves.toBe(
      '{"saved":true}',
    );
    await expect(
      readFile(join(dataHome, 'sessions', 'project', 'sid.json'), 'utf8'),
    ).resolves.toBe('{"session":true}');
    await expect(
      readFile(
        join(dataHome, 'runtime', 'antigravity-cwd', 'sid', 'state'),
        'utf8',
      ),
    ).resolves.toBe('agy');
    await expect(
      readFile(join(dataHome, 'runtime', 'counter.json'), 'utf8'),
    ).rejects.toThrow();
  });

  it('never overwrites data already created in CLAUDE_PLUGIN_DATA', async () => {
    await mkdir(legacyHome, { recursive: true });
    await mkdir(dataHome, { recursive: true });
    await writeFile(join(legacyHome, 'config.json'), 'legacy');
    await writeFile(join(dataHome, 'config.json'), 'current');

    await expect(migrateLegacyData({ legacyHome, dataHome })).resolves.toBe(
      false,
    );
    await expect(readFile(join(dataHome, 'config.json'), 'utf8')).resolves.toBe(
      'current',
    );
  });

  it('merges missing legacy sessions into an existing session tree', async () => {
    await mkdir(join(legacyHome, 'sessions', 'legacy-project'), {
      recursive: true,
    });
    await mkdir(join(dataHome, 'sessions', 'current-project'), {
      recursive: true,
    });
    await writeFile(
      join(legacyHome, 'sessions', 'legacy-project', 'sid.json'),
      'legacy',
    );
    await writeFile(
      join(dataHome, 'sessions', 'current-project', 'sid.json'),
      'current',
    );

    await expect(migrateLegacyData({ legacyHome, dataHome })).resolves.toBe(
      true,
    );
    await expect(
      readFile(
        join(dataHome, 'sessions', 'legacy-project', 'sid.json'),
        'utf8',
      ),
    ).resolves.toBe('legacy');
    await expect(
      readFile(
        join(dataHome, 'sessions', 'current-project', 'sid.json'),
        'utf8',
      ),
    ).resolves.toBe('current');
  });

  it('is idempotent after writing its migration marker', async () => {
    await mkdir(legacyHome, { recursive: true });
    await writeFile(join(legacyHome, 'config.json'), 'legacy');

    await expect(migrateLegacyData({ legacyHome, dataHome })).resolves.toBe(
      true,
    );
    await writeFile(join(legacyHome, 'config.json'), 'changed');
    await expect(migrateLegacyData({ legacyHome, dataHome })).resolves.toBe(
      false,
    );
    await expect(readFile(join(dataHome, 'config.json'), 'utf8')).resolves.toBe(
      'legacy',
    );
  });
});
