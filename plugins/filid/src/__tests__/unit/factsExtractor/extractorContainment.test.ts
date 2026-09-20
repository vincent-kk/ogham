import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as dependencyReferences from '../../../adapters/ecmascript/structure/extractDependencyReferences.js';
import { extractFileFacts } from '../../../factsExtractor/index.js';
import { VERSION } from '../../../version.js';

/** Temporary project each case extracts from. */
let root: string;
/** Directory outside the project, removed with it. */
let outside: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-facts-root-'));
  outside = mkdtempSync(join(tmpdir(), 'filid-facts-outside-'));
  writeFileSync(join(root, 'a.ts'), "import { b } from './b.js';\n");
  writeFileSync(join(root, 'b.ts'), 'export const b = 1;\n');
  writeFileSync(join(outside, 'secret.ts'), 'export const secret = 1;\n');
});

afterEach(() => {
  chmodSync(root, 0o755);
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

describe('the extractor never reads outside the project', () => {
  it.each([
    ['a parent-relative path', '../outside.ts'],
    ['an absolute path outside', '<outside>/secret.ts'],
  ])('rejects %s as outside-project', async (_label, input) => {
    const path = input.replace('<outside>', outside);
    const extraction = await extractFileFacts(root, [path, 'a.ts'], 'cmd');
    expect(extraction.records.map(({ path: record }) => record)).toEqual([
      'a.ts',
    ]);
    expect(extraction.rejected).toEqual([{ path, reason: 'outside-project' }]);
  });

  it.for([['file'], ['directory']] as const)(
    'rejects a %s reached through a link that leaves the root',
    async ([kind], { skip }) => {
      const link = join(root, kind === 'file' ? 'linked.ts' : 'linkedDir');
      try {
        symlinkSync(
          kind === 'file' ? join(outside, 'secret.ts') : outside,
          link,
        );
      } catch {
        skip('symbolic links cannot be created on this platform');
      }
      const input = kind === 'file' ? 'linked.ts' : 'linkedDir/secret.ts';
      const extraction = await extractFileFacts(root, [input], 'cmd');
      expect(extraction.records).toEqual([]);
      expect(extraction.rejected).toEqual([
        { path: input, reason: 'outside-project' },
      ]);
    },
  );

  it('rejects a missing path and a directory without a record', async () => {
    mkdirSync(join(root, 'dir'));
    const extraction = await extractFileFacts(root, ['gone.ts', 'dir'], 'cmd');
    expect(extraction.records).toEqual([]);
    expect(extraction.rejected).toEqual([
      { path: 'gone.ts', reason: 'missing' },
      { path: 'dir', reason: 'not-a-file' },
    ]);
  });
});

describe('a reference that resolves outside the root is external', () => {
  it('records a relative import of a file outside the project as external, like a package', async () => {
    const specifier = `../${outside.split(/[\\/]/).pop() ?? ''}/secret.js`;
    writeFileSync(
      join(root, 'reach.ts'),
      `import { secret } from '${specifier}';\n`,
    );
    const [record] = (await extractFileFacts(root, ['reach.ts'], 'cmd'))
      .records;
    expect(record.references).toEqual([
      { specifier, kind: 'static', resolved: { external: specifier } },
    ]);
  });
});

describe('one failing file does not stop the run', () => {
  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'lists a file that cannot be read as unreadable and gives it no record',
    async () => {
      writeFileSync(join(root, 'locked.ts'), 'export const locked = 1;\n');
      chmodSync(join(root, 'locked.ts'), 0o000);
      const extraction = await extractFileFacts(
        root,
        ['locked.ts', 'b.ts'],
        'cmd',
      );
      chmodSync(join(root, 'locked.ts'), 0o644);
      expect(extraction.records.map(({ path }) => path)).toEqual(['b.ts']);
      expect(extraction.unreadable).toEqual(['locked.ts']);
      expect(extraction.records[0]).not.toHaveProperty('toolError');
    },
  );

  it('records a file holding a NUL byte as a toolError, not as exact facts', async () => {
    const bytes = Buffer.from("import { b } from './b.js';\n\0\n");
    writeFileSync(join(root, 'binary.ts'), bytes);
    const extraction = await extractFileFacts(
      root,
      ['binary.ts', 'b.ts'],
      'cmd',
    );
    expect(extraction.unreadable).toEqual([]);
    expect(extraction.records[1]).toEqual({
      schemaVersion: 1,
      path: 'binary.ts',
      contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      references: [],
      toolError: {
        message: expect.stringMatching(/^binary content: /) as string,
      },
      provenance: expect.objectContaining({ tool: 'filid-facts' }),
    });
    expect(extraction.records[0]).not.toHaveProperty('toolError');
  });

  it('binds an adapter failure on read bytes to those bytes as a toolError record', async () => {
    const failure = vi
      .spyOn(dependencyReferences, 'extractDependencyReferences')
      .mockRejectedValueOnce(new Error(`lexer broke in ${join(root, 'a.ts')}`));
    const extraction = await extractFileFacts(root, ['a.ts', 'b.ts'], 'cmd');
    failure.mockRestore();
    expect(extraction.unreadable).toEqual([]);
    expect(extraction.records[0]).toEqual({
      schemaVersion: 1,
      path: 'a.ts',
      contentHash: `sha256:${createHash('sha256').update("import { b } from './b.js';\n").digest('hex')}`,
      references: [],
      toolError: { message: 'lexer broke in a.ts' },
      provenance: expect.objectContaining({ tool: 'filid-facts' }),
    });
    expect(extraction.records[1]).not.toHaveProperty('toolError');
  });
});

describe('a toolError message holds no absolute path', () => {
  it('replaces absolute paths outside the file and the root with a placeholder', async () => {
    const failure = vi
      .spyOn(dependencyReferences, 'extractDependencyReferences')
      .mockRejectedValueOnce(
        new Error(
          `cannot open '/opt/elsewhere/x.ts' or C:\\Temp\\y.ts for ${join(root, 'a.ts')}`,
        ),
      );
    const extraction = await extractFileFacts(root, ['a.ts'], 'cmd');
    failure.mockRestore();
    expect(extraction.records[0].toolError).toEqual({
      message: "cannot open '<path>' or <path> for a.ts",
    });
  });
});

describe('one physical file yields at most one record', () => {
  it('records a case variant of a path once, under the name on disk', async ({
    skip,
  }) => {
    if (!existsSync(join(root, 'A.TS')))
      skip('the file system distinguishes letter case');
    const extraction = await extractFileFacts(root, ['A.TS', 'a.ts'], 'cmd');
    expect(extraction.records.map(({ path }) => path)).toEqual(['a.ts']);
    expect(extraction.rejected).toEqual([]);
  });

  it.for([
    ['a file link inside the tree', 'linkIn.ts', 'b.ts'],
    ['a directory link back to the root', 'selfLoop/selfLoop/a.ts', '.'],
  ] as const)(
    'rejects %s as symlink and keeps the real file once',
    async ([, input, target], { skip }) => {
      const link = join(root, input.split('/')[0]);
      try {
        symlinkSync(join(root, target), link);
      } catch {
        skip('symbolic links cannot be created on this platform');
      }
      const extraction = await extractFileFacts(
        root,
        [input, 'a.ts', 'b.ts'],
        'cmd',
      );
      expect(extraction.records.map(({ path }) => path)).toEqual([
        'a.ts',
        'b.ts',
      ]);
      expect(extraction.rejected).toEqual([{ path: input, reason: 'symlink' }]);
    },
  );
});

describe('records are deterministic and carry provenance', () => {
  it('sorts, deduplicates and hashes the bytes', async () => {
    const extraction = await extractFileFacts(
      root,
      ['b.ts', 'a.ts', './a.ts', join(root, 'a.ts')],
      'filid-facts --root . a.ts',
    );
    expect(extraction.records.map(({ path }) => path)).toEqual([
      'a.ts',
      'b.ts',
    ]);
    expect(extraction.records[0]).toMatchObject({
      schemaVersion: 1,
      contentHash: `sha256:${createHash('sha256').update("import { b } from './b.js';\n").digest('hex')}`,
      references: [
        { specifier: './b.js', kind: 'static', resolved: { path: 'b.ts' } },
      ],
      provenance: {
        tool: 'filid-facts',
        version: VERSION,
        command: 'filid-facts --root . a.ts',
        tier: 'tool',
        resolutionInputs: [],
      },
    });
  });

  it('produces the same bytes twice and holds no absolute path', async () => {
    const first = JSON.stringify(
      await extractFileFacts(root, ['a.ts', 'b.ts'], 'cmd'),
    );
    const second = JSON.stringify(
      await extractFileFacts(root, ['b.ts', 'a.ts'], 'cmd'),
    );
    expect(second).toBe(first);
    expect(first).not.toContain(root);
  });
});
