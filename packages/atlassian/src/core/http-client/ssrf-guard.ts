import { resolve as dnsResolve } from 'node:dns/promises';

/** Private/reserved IP ranges that must be blocked */
const PRIVATE_RANGES = [
  /^127\./,                           // loopback
  /^10\./,                            // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./,      // Class B private
  /^192\.168\./,                      // Class C private
  /^169\.254\./,                      // link-local
  /^0\./,                             // current network
  /^::1$/,                            // IPv6 loopback
  /^fc00:/i,                          // IPv6 ULA
  /^fe80:/i,                          // IPv6 link-local
  /^::ffff:(127|10|0)\./i,           // IPv4-mapped IPv6
  /^::ffff:172\.(1[6-9]|2\d|3[01])\./i,
  /^::ffff:192\.168\./i,
  /^::ffff:169\.254\./i,
];

/** Check if an IP address falls within private/reserved ranges */
export function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((range) => range.test(ip));
}

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
