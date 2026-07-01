import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  detectFrameworkReserved,
  detectFrameworks,
} from '../../../core/tree/fractalTree/scanner/detectFrameworks.js';

const tmpRoots: string[] = [];

/** Create an isolated temp directory tree; registered for afterEach cleanup. */
function makeTmpRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-detect-fw-'));
  tmpRoots.push(root);
  return root;
}

/** Write a package.json with the given dependency maps at `dir`. */
function writePkg(
  dir: string,
  deps: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  },
): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'x', ...deps }),
  );
}

afterEach(() => {
  while (tmpRoots.length > 0)
    rmSync(tmpRoots.pop()!, { recursive: true, force: true });
});

describe('detectFrameworks', () => {
  // --- basic ---
  it('detects a framework from package.json in the same directory', () => {
    const root = makeTmpRoot();
    writePkg(root, { dependencies: { next: '^16.0.0' } });
    expect(detectFrameworks(root)).toEqual(['next']);
  });

  it('walks up to find the nearest package.json from a sub-path', () => {
    const root = makeTmpRoot();
    writePkg(root, { dependencies: { next: '^16.0.0' } });
    const sub = join(root, 'src', 'app');
    mkdirSync(sub, { recursive: true });
    expect(detectFrameworks(sub)).toEqual(['next']);
  });

  it('returns [] when no package.json exists up the whole chain', () => {
    const root = makeTmpRoot();
    const sub = join(root, 'a', 'b');
    mkdirSync(sub, { recursive: true });
    expect(detectFrameworks(sub)).toEqual([]);
  });

  // --- complex ---
  it('nearest-wins: the package package.json wins over the monorepo root', () => {
    const root = makeTmpRoot();
    // Monorepo root declares remix; the web package declares next.
    writePkg(root, { dependencies: { '@remix-run/react': '^2.0.0' } });
    const web = join(root, 'packages', 'web');
    writePkg(web, { dependencies: { next: '^16.0.0' } });
    const appDir = join(web, 'src', 'app');
    mkdirSync(appDir, { recursive: true });
    expect(detectFrameworks(appDir)).toEqual(['next']);
  });

  it('stops at a malformed package.json without walking further up', () => {
    const root = makeTmpRoot();
    writePkg(root, { dependencies: { next: '^16.0.0' } });
    const inner = join(root, 'pkg');
    mkdirSync(inner, { recursive: true });
    writeFileSync(join(inner, 'package.json'), '{ this is not json');
    expect(detectFrameworks(inner)).toEqual([]);
  });

  it('detects a framework declared in devDependencies', () => {
    const root = makeTmpRoot();
    writePkg(root, { devDependencies: { nuxt: '^3.0.0' } });
    expect(detectFrameworks(root)).toEqual(['nuxt']);
  });

  it('returns [] for a package.json with no framework dependency', () => {
    const root = makeTmpRoot();
    writePkg(root, { dependencies: { lodash: '^4.0.0' } });
    expect(detectFrameworks(root)).toEqual([]);
  });
});

describe('detectFrameworkReserved', () => {
  it('resolves reserved files (incl. globals.css) for a Next sub-path', () => {
    const root = makeTmpRoot();
    writePkg(root, { dependencies: { next: '^16.0.0' } });
    const appDir = join(root, 'src', 'app');
    mkdirSync(appDir, { recursive: true });
    const reserved = detectFrameworkReserved(appDir);
    expect(reserved).toContain('page.tsx');
    expect(reserved).toContain('globals.css');
  });
});
