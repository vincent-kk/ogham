import type { Config } from '@/config/index.js';

/**
 * Builds the `--extractor-args youtube:player_client=...` flag prepended to every
 * invocation. Empty when disabled (YTDLP_PLAYER_CLIENT set blank).
 */
export function playerClientArg(config: Config): string[] {
  return config.playerClient
    ? ['--extractor-args', `youtube:player_client=${config.playerClient}`]
    : [];
}
