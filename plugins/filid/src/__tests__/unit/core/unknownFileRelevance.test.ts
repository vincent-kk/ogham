import { describe, expect, it } from 'vitest';

import { partitionUnknownFiles } from '../../../core/analysis/dependencyGraph/index.js';
import { containsPathToken } from '../../../core/analysis/dependencyGraph/relevance/containsPathToken.js';

describe('a path token is a name between a path delimiter and a non-identifier character', () => {
  it.each([
    ['const n = reindex(list);', false],
    ['list.indexOf(item);', false],
    ['export const index = 1;', false],
    ["import { a } from './index';", true],
    ["import { a } from './index.js';", true],
    ['see /index.ts for the barrel', true],
    ["import { a } from './INDEX';", true],
    ['load(`./index`)', true],
    ["import { a } from './indexes';", false],
    ['./index', true],
  ])('%j contains the token index: %s', (text, expected) => {
    expect(containsPathToken(text, 'index')).toBe(expected);
  });

  it('finds no token for an empty name', () => {
    expect(containsPathToken("import { a } from './a';", '')).toBe(false);
  });
});

describe('only unknown files related to the targets are relevant', () => {
  /** Unrelated file texts by project-relative path; a missing entry cannot be read. */
  const texts: Readonly<Record<string, string>> = {
    'domain/b/note.tsx':
      "export const Note = () => <p>Don't</p>; export { other } from './other.js';\n",
    'domain/b/named.tsx':
      "export const Note = () => <p>Don't</p>; export { value } from '../a/value.js';\n",
    'domain/a/inner.tsx': "export const X = () => <p>Don't</p>;\n",
    'domain/c/consumer.ts': "export { x } from '@alias/whatever';\n",
  };
  const readText = (path: string) => texts[path] ?? null;

  it('splits by containment, token, extra path, symlink cause and readability for a directory target', () => {
    const result = partitionUnknownFiles(
      [
        { path: 'domain/a/inner.tsx', causes: ['uncertain-local-dependency'] },
        { path: 'domain/b/named.tsx', causes: ['uncertain-local-dependency'] },
        { path: 'domain/b/note.tsx', causes: ['uncertain-local-dependency'] },
        {
          path: 'domain/c/consumer.ts',
          causes: ['unresolved-local-dependency'],
        },
        {
          path: 'domain/d/unreadable.ts',
          causes: ['dependency-analysis-failed'],
        },
        { path: 'linked', causes: ['symlink-not-followed'] },
      ],
      [{ path: 'domain/a', kind: 'directory' }],
      readText,
      ['domain/c/consumer.ts'],
    );
    expect(result.relevant.map(({ path }) => path)).toEqual([
      'domain/a/inner.tsx',
      'domain/b/named.tsx',
      'domain/c/consumer.ts',
      'domain/d/unreadable.ts',
      'linked',
    ]);
    expect(result.other.map(({ path }) => path)).toEqual(['domain/b/note.tsx']);
  });

  it('matches a module index through its parent directory name, and its subtree whatever the text', () => {
    const result = partitionUnknownFiles(
      [
        {
          path: 'domain/a/inner/deep.ts',
          causes: ['uncertain-local-dependency'],
        },
        { path: 'x/named.ts', causes: ['uncertain-local-dependency'] },
        { path: 'x/stemOnly.ts', causes: ['uncertain-local-dependency'] },
      ],
      [{ path: 'domain/a/index.ts', kind: 'module-index' }],
      (path) =>
        path === 'x/named.ts'
          ? "export { a } from '../domain/a';\n"
          : "export { i } from './index';\n",
    );
    expect(result.relevant.map(({ path }) => path)).toEqual([
      'domain/a/inner/deep.ts',
      'x/named.ts',
    ]);
    expect(result.other.map(({ path }) => path)).toEqual(['x/stemOnly.ts']);
  });

  it('matches a plain file by its stem only, not by its parent directory name', () => {
    const result = partitionUnknownFiles(
      [
        { path: 'x/sibling.ts', causes: ['uncertain-local-dependency'] },
        { path: 'x/stem.ts', causes: ['uncertain-local-dependency'] },
      ],
      [{ path: 'domain/utils/value.ts', kind: 'file' }],
      (path) =>
        path === 'x/stem.ts'
          ? "export { v } from '../domain/utils/value.js';\n"
          : "export { o } from '../domain/utils/other.js';\n",
    );
    expect(result.relevant.map(({ path }) => path)).toEqual(['x/stem.ts']);
    expect(result.other.map(({ path }) => path)).toEqual(['x/sibling.ts']);
  });

  it('relates every unknown file to a module index at the project root', () => {
    const result = partitionUnknownFiles(
      [
        { path: 'src/note.tsx', causes: ['uncertain-local-dependency'] },
        { path: 'deep/x/y.ts', causes: ['unresolved-local-dependency'] },
      ],
      [{ path: 'index.ts', kind: 'module-index' }],
      () => "export { other } from './other.js';\n",
    );
    expect(result.relevant.map(({ path }) => path)).toEqual([
      'src/note.tsx',
      'deep/x/y.ts',
    ]);
    expect(result.other).toEqual([]);
  });

  it('keeps an unfollowed link relevant even when its text reads as empty', () => {
    const result = partitionUnknownFiles(
      [{ path: 'linked', causes: ['symlink-not-followed'] }],
      [{ path: 'domain/a/value.ts', kind: 'file' }],
      () => '',
    );
    expect(result.relevant.map(({ path }) => path)).toEqual(['linked']);
  });
});
