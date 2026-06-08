// yt-dlp release source (ADR-4: cooldown-pinned, checksum-verified acquisition).

export const YTDLP_REPO = 'yt-dlp/yt-dlp';
export const RELEASES_API = `https://api.github.com/repos/${YTDLP_REPO}/releases`;
export const RELEASE_BY_TAG_API = `https://api.github.com/repos/${YTDLP_REPO}/releases/tags`;

// Filename of the checksum manifest published with every release.
export const SUMS_ASSET = 'SHA2-256SUMS';

// Per-platform standalone asset name. Keyed by `${process.platform}:${process.arch}`
// with a platform-only fallback.
export const ASSET_BY_PLATFORM: Record<string, string> = {
  'win32:x64': 'yt-dlp.exe',
  'win32:arm64': 'yt-dlp.exe',
  win32: 'yt-dlp.exe',
  'darwin:x64': 'yt-dlp_macos',
  'darwin:arm64': 'yt-dlp_macos',
  darwin: 'yt-dlp_macos',
  'linux:x64': 'yt-dlp_linux',
  'linux:arm64': 'yt-dlp_linux_aarch64',
  'linux:arm': 'yt-dlp_linux_armv7l',
  linux: 'yt-dlp_linux',
};

// Local executable filename inside the shared bin directory.
export const LOCAL_BINARY_NAME =
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
