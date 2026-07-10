import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getCacheDir,
  getImbasRoot,
  getProjectDir,
  getRunDir,
} from '../core/paths/paths.js';

describe('paths', () => {
  const cwd = '/home/user/myproject';

  it('getImbasRoot returns cwd/.imbas', () => {
    expect(getImbasRoot(cwd)).toBe(join(cwd, '.imbas'));
  });

  it('getProjectDir returns cwd/.imbas/<projectKey>', () => {
    expect(getProjectDir(cwd, 'PROJ')).toBe(join(cwd, '.imbas', 'PROJ'));
  });

  it('getCacheDir returns cwd/.imbas/<projectKey>/cache', () => {
    expect(getCacheDir(cwd, 'PROJ')).toBe(join(cwd, '.imbas', 'PROJ', 'cache'));
  });

  it('getRunDir returns cwd/.imbas/<projectKey>/runs/<runId>', () => {
    expect(getRunDir(cwd, 'PROJ', '20240101-001')).toBe(
      join(cwd, '.imbas', 'PROJ', 'runs', '20240101-001'),
    );
  });

  it('handles different project keys', () => {
    expect(getProjectDir(cwd, 'MYTEAM')).toBe(join(cwd, '.imbas', 'MYTEAM'));
    expect(getCacheDir(cwd, 'MYTEAM')).toBe(
      join(cwd, '.imbas', 'MYTEAM', 'cache'),
    );
  });

  it('handles different run IDs', () => {
    expect(getRunDir(cwd, 'PROJ', '20240215-042')).toBe(
      join(cwd, '.imbas', 'PROJ', 'runs', '20240215-042'),
    );
  });

  it('paths are composable (getRunDir contains getProjectDir)', () => {
    const projectDir = getProjectDir(cwd, 'PROJ');
    const runDir = getRunDir(cwd, 'PROJ', '20240101-001');
    expect(runDir.startsWith(projectDir)).toBe(true);
  });

  it('maps GitHub owner/repo refs to owner--repo directories', () => {
    expect(getProjectDir(cwd, 'owner/repo')).toBe(
      join(cwd, '.imbas', 'owner--repo'),
    );
    expect(getRunDir(cwd, 'owner/repo', '20260404-001')).toBe(
      join(cwd, '.imbas', 'owner--repo', 'runs', '20260404-001'),
    );
  });

  it('rejects project refs that cannot form a safe directory segment', () => {
    expect(() => getProjectDir(cwd, '..')).toThrow(/Invalid project_ref/);
    expect(() => getProjectDir(cwd, '')).toThrow(/Invalid project_ref/);
    expect(() => getProjectDir(cwd, 'a\\b')).toThrow(/Invalid project_ref/);
  });

  it('neutralizes traversal-shaped refs into single segments', () => {
    expect(getProjectDir(cwd, '../evil')).toBe(join(cwd, '.imbas', '..--evil'));
  });
});
