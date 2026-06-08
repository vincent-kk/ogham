import { ASSET_BY_PLATFORM } from '@/constants/github.js';

/** Resolves the yt-dlp standalone asset filename for an OS/arch pair. */
export function assetNameForPlatform(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  return (
    ASSET_BY_PLATFORM[`${platform}:${arch}`] ??
    ASSET_BY_PLATFORM[platform] ??
    'yt-dlp'
  );
}
