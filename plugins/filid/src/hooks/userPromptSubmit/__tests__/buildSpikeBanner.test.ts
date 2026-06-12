import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildSpikeBanner } from '../utils/buildSpikeBanner.js';

const SHA_0 = '0'.repeat(40);
const SHA_A = 'a'.repeat(40);

let root: string;

function makeRepo(branch: string, createdEpochSec: number): void {
  mkdirSync(join(root, '.git'), { recursive: true });
  writeFileSync(join(root, '.git', 'HEAD'), `ref: refs/heads/${branch}\n`);
  const segments = branch.split('/');
  mkdirSync(join(root, '.git', 'refs', 'heads', ...segments.slice(0, -1)), {
    recursive: true,
  });
  writeFileSync(
    join(root, '.git', 'refs', 'heads', ...segments),
    `${SHA_A}\n`,
  );
  mkdirSync(
    join(root, '.git', 'logs', 'refs', 'heads', ...segments.slice(0, -1)),
    { recursive: true },
  );
  writeFileSync(
    join(root, '.git', 'logs', 'refs', 'heads', ...segments),
    `${SHA_0} ${SHA_A} Dev <d@x.io> ${createdEpochSec} +0000\tbranch: Created from HEAD\n`,
  );
  mkdirSync(join(root, '.filid'), { recursive: true });
  writeFileSync(join(root, '.filid', 'config.json'), '{}');
}

function writeManifest(headSha: string, createdAt?: string): void {
  const dir = join(root, '.filid', 'harvest', 'spike--poc');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      head_sha: headSha,
      created_at: createdAt ?? new Date().toISOString(),
    }),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-banner-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('buildSpikeBanner', () => {
  it('returns null off spike branches', () => {
    makeRepo('main', Math.floor(Date.now() / 1000));
    expect(buildSpikeBanner(root)).toBeNull();
  });

  it('emits SPIKE MODE with unharvested count and harvest exit when no manifest exists', () => {
    makeRepo('spike/poc', Math.floor(Date.now() / 1000));
    const banner = buildSpikeBanner(root);
    expect(banner).toContain('SPIKE MODE — branch spike/poc (day 1');
    expect(banner).toContain('Unharvested decisions (ref updates): 1');
    expect(banner).toContain('INSUFFICIENT-EVIDENCE (harvest-required)');
    expect(banner).not.toContain('TIMEBOX EXCEEDED');
  });

  it('emphasizes the timebox after 7 elapsed days', () => {
    makeRepo(
      'spike/poc',
      Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60,
    );
    const banner = buildSpikeBanner(root);
    expect(banner).toContain('day 9');
    expect(banner).toContain('TIMEBOX EXCEEDED');
  });

  it('reports a current manifest when head_sha matches HEAD', () => {
    makeRepo('spike/poc', Math.floor(Date.now() / 1000));
    writeManifest(SHA_A);
    const banner = buildSpikeBanner(root);
    expect(banner).toContain('Harvest manifest current');
    expect(banner).not.toContain('STALE');
  });

  it('reports a STALE manifest when head moved past the harvested sha', () => {
    makeRepo('spike/poc', Math.floor(Date.now() / 1000));
    writeManifest('e'.repeat(40));
    const banner = buildSpikeBanner(root);
    expect(banner).toContain('Harvest manifest STALE');
    expect(banner).toContain('Re-run /filid:harvest');
  });

  it('reports an EXPIRED manifest when sealed past the timebox despite a matching head', () => {
    makeRepo('spike/poc', Math.floor(Date.now() / 1000));
    writeManifest(
      SHA_A,
      new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    );
    const banner = buildSpikeBanner(root);
    expect(banner).toContain('Harvest manifest EXPIRED');
    expect(banner).not.toContain('manifest current');
  });
});
