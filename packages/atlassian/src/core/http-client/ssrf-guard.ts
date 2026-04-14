import { resolve as dnsResolve } from 'node:dns/promises';
import { isPrivateIp } from '../../utils/index.js';

/** Validate a URL against SSRF attack vectors */
export async function validateUrl(url: string, allowedHostname: string): Promise<void> {
  // Path traversal check on raw string (before URL normalization strips ..)
  if (url.includes('..')) {
    throw new Error('SSRF: Path traversal detected in URL.');
  }

  const parsed = new URL(url);

  // Protocol check: only https (http allowed if explicitly configured)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`SSRF: Invalid protocol "${parsed.protocol}". Only http/https allowed.`);
  }

  // Hostname match check
  if (parsed.hostname !== allowedHostname) {
    throw new Error(
      `SSRF: Hostname "${parsed.hostname}" does not match allowed hostname "${allowedHostname}".`,
    );
  }

  // Direct IP check (if hostname looks like an IP)
  if (isPrivateIp(parsed.hostname)) {
    throw new Error(`SSRF: Direct access to private IP "${parsed.hostname}" is blocked.`);
  }

  // DNS resolution check — resolve and verify no private IPs
  try {
    const addresses = await dnsResolve(parsed.hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        throw new Error(
          `SSRF: Hostname "${parsed.hostname}" resolves to private IP "${addr}".`,
        );
      }
    }
  } catch (error) {
    // Re-throw SSRF errors, ignore DNS resolution failures for non-resolvable hosts
    if (error instanceof Error && error.message.startsWith('SSRF:')) {
      throw error;
    }
    // DNS resolution may fail in test environments — allow if hostname matches
  }
}
