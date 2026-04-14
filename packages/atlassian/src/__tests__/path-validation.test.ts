import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateSavePath } from '../utils/index.js';

const tmpBase = resolve(process.cwd(), '.temp');

describe('validateSavePath', () => {
  it('resolves relative path under .temp/', () => {
    const result = validateSavePath('output/file.png');
    expect(result).toBe(resolve(tmpBase, 'output/file.png'));
  });

  it('strips .temp/ prefix from relative path to avoid double nesting', () => {
    const result = validateSavePath('.temp/KAN-27/file.png');
    expect(result).toBe(resolve(tmpBase, 'KAN-27/file.png'));
  });

  it('accepts absolute path already under .temp/', () => {
    const abs = resolve(tmpBase, 'downloads/img.png');
    const result = validateSavePath(abs);
    expect(result).toBe(abs);
  });

  it('rejects path with .. traversal', () => {
    expect(() => validateSavePath('../../etc/passwd')).toThrow('path traversal');
  });

  it('rejects path with embedded .. segment', () => {
    expect(() => validateSavePath('output/../../../etc/passwd')).toThrow('path traversal');
  });

  it('rejects absolute path outside working directory', () => {
    expect(() => validateSavePath('/etc/cron.d/evil')).toThrow('absolute paths must be under working directory');
  });

  it('resolves bare filename under .temp/', () => {
    const result = validateSavePath('file.png');
    expect(result).toBe(resolve(tmpBase, 'file.png'));
  });
});
