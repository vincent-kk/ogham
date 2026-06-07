import { describe, expect, it, vi } from 'vitest';

import { SUMS_ASSET } from '../constants/github.js';
import { assetNameForPlatform } from '../ytdlp/asset-name.js';
import { selectSafeRelease } from '../ytdlp/select-safe-release.js';
import { createVersionResolver, type GithubRelease } from '../ytdlp/version.js';

const NOW = Date.UTC(2025, 0, 31);
const DAY = 86_400_000;

function rel(
  tag: string,
  daysAgo: number,
  opts: { draft?: boolean; prerelease?: boolean; withAssets?: boolean } = {},
): GithubRelease {
  const asset = assetNameForPlatform();
  return {
    tag_name: tag,
    published_at: new Date(NOW - daysAgo * DAY).toISOString(),
    draft: opts.draft,
    prerelease: opts.prerelease,
    assets: opts.withAssets
      ? [
          { name: asset, browser_download_url: `https://dl/${tag}/${asset}` },
          { name: SUMS_ASSET, browser_download_url: `https://dl/${tag}/${SUMS_ASSET}` },
        ]
      : [],
  };
}

describe('selectSafeRelease', () => {
  it('picks the newest release older than the cooldown', () => {
    const releases = [rel('new', 2), rel('safe', 10), rel('older', 30)];
    expect(selectSafeRelease(releases, 7, NOW)?.tag_name).toBe('safe');
  });

  it('excludes releases inside the cooldown window', () => {
    expect(selectSafeRelease([rel('new', 2)], 7, NOW)).toBeNull();
  });

  it('excludes drafts and prereleases', () => {
    const releases = [rel('draft', 30, { draft: true }), rel('pre', 30, { prerelease: true })];
    expect(selectSafeRelease(releases, 7, NOW)).toBeNull();
  });
});

describe('createVersionResolver', () => {
  it('resolves asset + checksum URLs for a safe release', async () => {
    const fetchJson = vi.fn(async () => [rel('2025.01.01', 30, { withAssets: true })]);
    const resolver = createVersionResolver({ config: { cooldownDays: 7 }, fetchJson, now: () => NOW });
    const resolved = await resolver.resolveSafeVersion();
    expect(resolved.tag).toBe('2025.01.01');
    expect(resolved.assetUrl).toContain(assetNameForPlatform());
    expect(resolved.sumsUrl).toContain(SUMS_ASSET);
  });

  it('uses the pinned version directly', async () => {
    const fetchJson = vi.fn(async () => rel('pinned', 1, { withAssets: true }));
    const resolver = createVersionResolver({
      config: { cooldownDays: 7, pinnedVersion: 'pinned' },
      fetchJson,
      now: () => NOW,
    });
    const resolved = await resolver.resolveSafeVersion();
    expect(resolved.tag).toBe('pinned');
    expect(fetchJson).toHaveBeenCalledOnce();
  });

  it('throws when the platform asset is missing', async () => {
    const fetchJson = vi.fn(async () => [rel('2025.01.01', 30, { withAssets: false })]);
    const resolver = createVersionResolver({ config: { cooldownDays: 7 }, fetchJson, now: () => NOW });
    await expect(resolver.resolveSafeVersion()).rejects.toMatchObject({ code: 'BINARY_UNAVAILABLE' });
  });
});
