import { resolve as dnsResolve } from "node:dns/promises";

import { isPrivateIp } from "../../../utils/ip.js";
import { Messages } from "../../../constants/messages.js";

/** DNS resolver seam — injectable so the rebinding branch is testable. */
export type DnsResolver = (hostname: string) => Promise<string[]>;

/**
 * Validate an outbound URL against SSRF vectors: path traversal, non-http(s)
 * protocols, hosts outside the NCBI allowlist, and private/reserved IPs (direct
 * or via DNS resolution — rebinding defense). Throws on violation; the single
 * network choke point.
 */
export async function validateUrl(
  url: string,
  allowedHosts: readonly string[],
  allowPrivateIp = false,
  resolveDns: DnsResolver = dnsResolve,
): Promise<void> {
  // Path traversal on the raw path segment only (before `?`) — checked before
  // URL normalization collapses "..", while query terms may legitimately
  // contain "..".
  const rawPath = url.split("?", 1)[0];
  if (rawPath.includes("..")) {
    throw new Error(Messages.SSRF_PATH_TRAVERSAL);
  }

  const parsed = new URL(url);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${Messages.SSRF_INVALID_PROTOCOL} (${parsed.protocol})`);
  }

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(`${Messages.SSRF_HOST_NOT_ALLOWED} (${parsed.hostname})`);
  }

  if (allowPrivateIp) return;

  if (isPrivateIp(parsed.hostname)) {
    throw new Error(`${Messages.SSRF_PRIVATE_IP} (${parsed.hostname})`);
  }

  try {
    const addresses = await resolveDns(parsed.hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        throw new Error(`${Messages.SSRF_PRIVATE_IP} (${addr})`);
      }
    }
  } catch (error) {
    // Re-throw SSRF violations; ignore unresolvable hosts (test environments).
    if (error instanceof Error && error.message.startsWith("SSRF")) throw error;
  }
}
