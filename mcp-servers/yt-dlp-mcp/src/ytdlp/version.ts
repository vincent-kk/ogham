import { ASSET_BY_PLATFORM, RELEASE_BY_TAG_API, RELEASES_API, SUMS_ASSET } from '../constants/github.js';
import { ErrorCode, YtDlpMcpError } from '../domain/errors.js';

export interface GithubAsset {
  name: string;
  browser_download_url: string;
}

export interface GithubRelease {
  tag_name: string;
  published_at: string;
  draft?: boolean;
  prerelease?: boolean;
  assets: GithubAsset[];
}

export interface ResolvedVersion {
  tag: string;
  assetUrl: string;
  sumsUrl: string;
}

export interface VersionResolver {
  resolveSafeVersion(signal?: AbortSignal): Promise<ResolvedVersion>;
}

const DAY_MS = 86_400_000;

export function assetNameForPlatform(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  return ASSET_BY_PLATFORM[`${platform}:${arch}`] ?? ASSET_BY_PLATFORM[platform] ?? 'yt-dlp';
}

/**
 * Pure cooldown selection (ADR-4): newest non-draft/prerelease release published
 * at least `cooldownDays` ago. Returns null when none qualify.
 */
export function selectSafeRelease(
  releases: GithubRelease[],
  cooldownDays: number,
  now: number,
): GithubRelease | null {
  const cutoff = now - cooldownDays * DAY_MS;
  const eligible = releases
    .filter((r) => !r.draft && !r.prerelease && typeof r.tag_name === 'string' && r.tag_name.length > 0)
    .map((r) => ({ release: r, ts: Date.parse(r.published_at) }))
    .filter((x) => Number.isFinite(x.ts) && x.ts <= cutoff)
    .sort((a, b) => b.ts - a.ts);
  return eligible[0]?.release ?? null;
}

export interface VersionResolverDeps {
  config: { cooldownDays: number; pinnedVersion?: string };
  fetchJson: (url: string, signal?: AbortSignal) => Promise<unknown>;
  now?: () => number;
  platform?: { platform: NodeJS.Platform; arch: string };
}

export function createVersionResolver(deps: VersionResolverDeps): VersionResolver {
  const now = deps.now ?? Date.now;
  const assetName = assetNameForPlatform(deps.platform?.platform, deps.platform?.arch);

  function pickAsset(release: GithubRelease): ResolvedVersion {
    const asset = release.assets?.find((a) => a.name === assetName);
    const sums = release.assets?.find((a) => a.name === SUMS_ASSET);
    if (!asset) {
      throw new YtDlpMcpError(
        ErrorCode.BINARY_UNAVAILABLE,
        `Release ${release.tag_name} has no asset '${assetName}'`,
      );
    }
    if (!sums) {
      throw new YtDlpMcpError(
        ErrorCode.CHECKSUM_MISMATCH,
        `Release ${release.tag_name} has no '${SUMS_ASSET}' manifest`,
      );
    }
    return {
      tag: release.tag_name,
      assetUrl: asset.browser_download_url,
      sumsUrl: sums.browser_download_url,
    };
  }

  return {
    async resolveSafeVersion(signal): Promise<ResolvedVersion> {
      if (deps.config.pinnedVersion) {
        const release = (await deps.fetchJson(
          `${RELEASE_BY_TAG_API}/${deps.config.pinnedVersion}`,
          signal,
        )) as GithubRelease;
        if (!release || typeof release.tag_name !== 'string') {
          throw new YtDlpMcpError(
            ErrorCode.BINARY_UNAVAILABLE,
            `Pinned version not found: ${deps.config.pinnedVersion}`,
          );
        }
        return pickAsset(release);
      }

      const releases = (await deps.fetchJson(`${RELEASES_API}?per_page=30`, signal)) as GithubRelease[];
      if (!Array.isArray(releases)) {
        throw new YtDlpMcpError(ErrorCode.NETWORK, 'Unexpected releases response from GitHub');
      }
      const release = selectSafeRelease(releases, deps.config.cooldownDays, now());
      if (!release) {
        throw new YtDlpMcpError(
          ErrorCode.BINARY_UNAVAILABLE,
          `No yt-dlp release older than ${deps.config.cooldownDays} days found`,
        );
      }
      return pickAsset(release);
    },
  };
}
