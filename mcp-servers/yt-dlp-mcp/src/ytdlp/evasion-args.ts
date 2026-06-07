import type { Config } from '../config.js';

/**
 * Builds the cookie/proxy yt-dlp arguments from config. Cookie file takes
 * precedence over browser extraction. Off unless explicitly configured (ADR-6).
 */
export function evasionArgs(config: Config): string[] {
  const args: string[] = [];
  if (config.evasion.cookiesFile) args.push('--cookies', config.evasion.cookiesFile);
  else if (config.evasion.cookiesFromBrowser) {
    args.push('--cookies-from-browser', config.evasion.cookiesFromBrowser);
  }
  if (config.evasion.proxy) args.push('--proxy', config.evasion.proxy);
  return args;
}
