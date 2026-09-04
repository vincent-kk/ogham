import { readFileSync } from 'node:fs';

import { resolvePublicAsset } from './resolvePublicAsset';

/**
 * Memoized settings-page source shared by repeated MCP calls.
 */
let cached: string | null = null;

/**
 * Loads and memoizes the built settings page shipped with the plugin.
 *
 * @returns The complete settings-page HTML source.
 */
export function loadSettingsHtml(): string {
  if (cached === null)
    cached = readFileSync(resolvePublicAsset('settings.html'), 'utf-8');

  return cached;
}
