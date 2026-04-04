import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import {
  getImbasRoot,
  getProjectDir,
  getCacheDir,
  getRunDir,
  getTempDir,
  getMediaDir,
} from '../core/paths.js';

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

  it('getTempDir returns cwd/.imbas/.temp', () => {
    expect(getTempDir(cwd)).toBe(join(cwd, '.imbas', '.temp'));
  });

  it('getMediaDir returns cwd/.imbas/.temp/<filename>', () => {
    expect(getMediaDir(cwd, 'video.mp4')).toBe(
      join(cwd, '.imbas', '.temp', 'video.mp4'),
    );
  });

  it('handles different project keys', () => {
    expect(getProjectDir(cwd, 'MYTEAM')).toBe(join(cwd, '.imbas', 'MYTEAM'));
    expect(getCacheDir(cwd, 'MYTEAM')).toBe(join(cwd, '.imbas', 'MYTEAM', 'cache'));
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
});
