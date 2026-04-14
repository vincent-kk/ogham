import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateSavePath } from '../utils/index.js';

describe('validateSavePath', () => {
  it('accepts path under cwd', () => {
    const result = validateSavePath('output/file.png');
    expect(result).toBe(resolve('output/file.png'));
  });

  it('rejects path with .. traversal', () => {
    expect(() => validateSavePath('../../etc/passwd')).toThrow('path traversal');
  });

  it('rejects path with embedded .. segment', () => {
    expect(() => validateSavePath('output/../../../etc/passwd')).toThrow('path traversal');
  });

  it('rejects path outside cwd and tmpdir', () => {
    expect(() => validateSavePath('/etc/cron.d/evil')).toThrow('must be under working directory');
  });

  it('returns normalized absolute path', () => {
    const result = validateSavePath('./downloads/img.png');
    expect(result).toBe(resolve('./downloads/img.png'));
    expect(result.startsWith('/')).toBe(true);
  });
});
