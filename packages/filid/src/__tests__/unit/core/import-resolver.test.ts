import { existsSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { resolveImportPath } from '../../../core/import-resolver.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
}));

const mockExistsSync = vi.mocked(existsSync);

describe('resolveImportPath', () => {
  // === Core tests (3) ===

  it('resolves ESM .js import to .ts file', () => {
    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/shared/utils.ts',
    );
    const result = resolveImportPath(
      '../../shared/utils.js',
      '/project/src/core/sub/foo.ts',
    );
    expect(result).toBe('/project/src/shared/utils.ts');
  });

  it('resolves extensionless import to index.ts', () => {
    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/shared/index.ts',
    );
    const result = resolveImportPath('./shared', '/project/src/foo.ts');
    expect(result).toBe('/project/src/shared/index.ts');
  });

  it('returns null for bare specifiers (package imports)', () => {
    expect(resolveImportPath('zod', '/project/src/foo.ts')).toBeNull();
    expect(resolveImportPath('node:fs', '/project/src/foo.ts')).toBeNull();
    expect(resolveImportPath('@org/package', '/project/src/foo.ts')).toBeNull();
  });

  // === Edge case tests ===

  it('resolves ESM .js import to .tsx file when .ts does not exist', () => {
    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/components/Button.tsx',
    );
    const result = resolveImportPath(
      './components/Button.js',
      '/project/src/app.ts',
    );
    expect(result).toBe('/project/src/components/Button.tsx');
  });

  it('resolves extensionless import to .ts file directly', () => {
    mockExistsSync.mockImplementation((p) => p === '/project/src/utils.ts');
    const result = resolveImportPath('./utils', '/project/src/foo.ts');
    expect(result).toBe('/project/src/utils.ts');
  });

  it('resolves nested relative paths (../../../)', () => {
    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/shared/helper.ts',
    );
    const result = resolveImportPath(
      '../../../shared/helper.js',
      '/project/src/features/auth/core/service.ts',
    );
    expect(result).toBe('/project/src/shared/helper.ts');
  });

  it('returns null when resolved file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const result = resolveImportPath('./nonexistent.js', '/project/src/foo.ts');
    expect(result).toBeNull();
  });

  it('resolves already-.ts imports via exact match', () => {
    mockExistsSync.mockImplementation((p) => p === '/project/src/helper.ts');
    const result = resolveImportPath('./helper.ts', '/project/src/foo.ts');
    expect(result).toBe('/project/src/helper.ts');
  });

  it('resolves .mjs to .mts', () => {
    mockExistsSync.mockImplementation((p) => p === '/project/src/util.mts');
    const result = resolveImportPath('./util.mjs', '/project/src/foo.ts');
    expect(result).toBe('/project/src/util.mts');
  });

  it('prefers .ts over index.ts for extensionless imports', () => {
    mockExistsSync.mockImplementation(
      (p) =>
        p === '/project/src/utils.ts' || p === '/project/src/utils/index.ts',
    );
    const result = resolveImportPath('./utils', '/project/src/foo.ts');
    // .ts direct file should be found first
    expect(result).toBe('/project/src/utils.ts');
  });

  it('resolves absolute path imports starting with /', () => {
    mockExistsSync.mockImplementation((p) => p === '/absolute/path/module.ts');
    const result = resolveImportPath(
      '/absolute/path/module.js',
      '/project/src/foo.ts',
    );
    expect(result).toBe('/absolute/path/module.ts');
  });

  it('resolves index.tsx when index.ts does not exist', () => {
    mockExistsSync.mockImplementation(
      (p) => p === '/project/src/components/index.tsx',
    );
    const result = resolveImportPath('./components', '/project/src/app.ts');
    expect(result).toBe('/project/src/components/index.tsx');
  });
});
