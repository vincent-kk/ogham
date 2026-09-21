import {
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { PassThrough } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { normalizeCommand } from '../../../factsExtractor/utils/input/normalizeCommand.js';
import { readFileList } from '../../../factsExtractor/utils/input/readFileList.js';
import { readListText } from '../../../factsExtractor/utils/input/readListText.js';
import { isOutputInsideProject } from '../../../factsExtractor/utils/paths/isOutputInsideProject.js';

/** Temporary project root. */
let root: string;
/** Directory outside the project. */
let outside: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-facts-inputs-root-'));
  outside = mkdtempSync(join(tmpdir(), 'filid-facts-inputs-out-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

describe('an output path is inside the project by its real location', () => {
  it('catches a path through an outside link that leads into the tree', ({
    skip,
  }) => {
    const link = join(outside, 'intoRoot');
    try {
      symlinkSync(root, link);
    } catch {
      skip('symbolic links cannot be created on this platform');
    }
    expect(
      isOutputInsideProject(
        root,
        realpathSync(root),
        join(link, 'new', 'facts.json'),
      ),
    ).toBe(true);
    expect(
      isOutputInsideProject(root, realpathSync(root), join(outside, 'f.json')),
    ).toBe(false);
  });
});

describe('a file list may be a JSON array of path strings', () => {
  it('reads a JSON array in order', () => {
    expect(readFileList(' ["b.ts", "a.ts"]\n')).toEqual(['b.ts', 'a.ts']);
  });

  it.each([
    ['a non-string entry', '["a.ts", 1]'],
    ['text that does not parse', '["a.ts",'],
  ])('throws on %s', (_label, text) => {
    expect(() => readFileList(text)).toThrow();
  });
});

describe('a list that cannot be read whole is refused, never shortened', () => {
  it('refuses standard input that does not end in time and returns no text', async () => {
    const input = new PassThrough();
    input.write('a.ts\n');
    const list = await readListText('-', input, 20);
    expect(list).toEqual({
      error: expect.stringContaining(
        'standard input did not end within 0.02 s',
      ),
    });
    expect(list).not.toHaveProperty('text');
  });

  it('returns the whole text of standard input that ends', async () => {
    const input = new PassThrough();
    input.end('a.ts\nb.ts\n');
    expect(await readListText('-', input, 1000)).toEqual({
      text: 'a.ts\nb.ts\n',
    });
  });

  it('refuses a list file over the size cap without reading it', async () => {
    const list = join(outside, 'huge.txt');
    writeFileSync(list, 'a.ts\n');
    truncateSync(list, 16 * 1024 * 1024 + 1);
    expect(await readListText(list, new PassThrough())).toEqual({
      error: `--files-from ${list} is larger than 16 MiB.`,
    });
    truncateSync(list, 16 * 1024 * 1024);
    expect(await readListText(list, new PassThrough())).toHaveProperty('text');
  });
});

describe('the recorded command holds no machine path', () => {
  it('makes an absolute path inside the root relative to it', () => {
    expect(
      normalizeCommand(
        [
          '--root',
          root,
          '--out',
          join(outside, 'f.json'),
          join(root, 'x/a.ts'),
        ],
        root,
        outside,
      ),
    ).toBe('filid-facts --root . --out <outside> x/a.ts');
  });

  it('resolves a relative option value against the working directory first', () => {
    expect(
      normalizeCommand(
        [
          '--root',
          `../${basename(root)}`,
          '--out',
          `../${basename(outside)}/f.json`,
          '--files-from',
          '-',
          'x/a.ts',
        ],
        root,
        outside,
      ),
    ).toBe('filid-facts --root . --out <outside> --files-from - x/a.ts');
  });
});
