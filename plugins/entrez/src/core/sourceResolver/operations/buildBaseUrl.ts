import type { EutilFn } from "../../../types/enums.js";
import { DEFAULT_EUTILS_BASE } from "../../../constants/defaults.js";

const FCGI_SUFFIX = ".fcgi";

/** Normalize a base URL to a trailing slash. */
function normalizeBase(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

/**
 * Build a full E-utility endpoint URL: `<base><fn>.fcgi`. `baseUrl` defaults to
 * the canonical eutils base; a configured mirror override is honored (the SSRF
 * allowlist, derived from this host, enforces scope).
 */
export function buildBaseUrl(
  fn: EutilFn,
  baseUrl: string = DEFAULT_EUTILS_BASE,
): string {
  return `${normalizeBase(baseUrl)}${fn}${FCGI_SUFFIX}`;
}
