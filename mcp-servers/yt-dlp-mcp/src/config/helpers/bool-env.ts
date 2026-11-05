import { ErrorCode, YtDlpMcpError } from '@/domain/errors.js';

/**
 * Parses a tool toggle without silently treating invalid input as false.
 * @param name Environment variable name included in validation errors.
 * @param value Optional environment text; accepts 1/true/yes/on and 0/false/no/off,
 * ignoring case and surrounding whitespace.
 * @param fallback Value used only when the input is absent or blank.
 * @returns The parsed toggle or its fallback.
 * @throws {YtDlpMcpError} When nonblank input is not a documented boolean.
 */
export function boolEnv(
  name: string,
  value: string | undefined,
  fallback = false,
): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new YtDlpMcpError(
    ErrorCode.INVALID_INPUT,
    `Invalid yt-dlp-mcp configuration: ${name}: expected 1/true/yes/on or 0/false/no/off`,
  );
}
