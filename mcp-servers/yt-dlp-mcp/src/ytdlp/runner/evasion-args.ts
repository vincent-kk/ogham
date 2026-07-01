import type { Config } from '@/config/index.js';

/**
 * Builds the rotation-invariant cookie yt-dlp arguments. Cookie file takes
 * precedence over browser extraction. Off unless explicitly configured (ADR-6).
 */
export function cookieArgs(config: Config): string[] {
  const args: string[] = [];
  if (config.evasion.cookiesFile)
    args.push('--cookies', config.evasion.cookiesFile);
  else if (config.evasion.cookiesFromBrowser)
    args.push('--cookies-from-browser', config.evasion.cookiesFromBrowser);

  return args;
}

/** Builds the per-call proxy yt-dlp argument; empty when no proxy is given. */
export function proxyArg(proxy?: string): string[] {
  return proxy ? ['--proxy', proxy] : [];
}

/**
 * Back-compat: full cookie+proxy arguments (cookies then proxy) for the single
 * static proxy in `config.evasion.proxy` unless an override is supplied.
 */
export function evasionArgs(config: Config, proxyOverride?: string): string[] {
  return [
    ...cookieArgs(config),
    ...proxyArg(proxyOverride ?? config.evasion.proxy),
  ];
}
