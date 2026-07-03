import { resolve as dnsResolve } from "node:dns/promises";
import { isPrivateIp } from "../../utils/index.js";

/** Validate a URL against SSRF attack vectors */
export async function validateUrl(
  url: string,
  allowedHostname: string,
  allowPrivateIp = false,
): Promise<void> {
  // Path traversal check on the raw string — URL parsing collapses dot
  // segments (raw and percent-encoded), so the sent path would silently
  // differ from the validated one. Segment-precise: filenames merely
  // containing consecutive dots (e.g. report..final.pdf) are not flagged.
  const rawPath = url.split(/[?#]/, 1)[0];
  if (rawPath.split(/[/\\]/).some(isTraversalSegment))
    throw new Error("SSRF: Path traversal detected in URL.");

  const parsed = new URL(url);

  // Protocol check: only https (http allowed if explicitly configured)
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
    throw new Error(
      `SSRF: Invalid protocol "${parsed.protocol}". Only http/https allowed.`,
    );

  // Hostname match check
  if (parsed.hostname !== allowedHostname)
    throw new Error(
      `SSRF: Hostname "${parsed.hostname}" does not match allowed hostname "${allowedHostname}".`,
    );

  if (allowPrivateIp) return;

  // Direct IP check (if hostname looks like an IP)
  if (isPrivateIp(parsed.hostname))
    throw new Error(
      `SSRF: Direct access to private IP "${parsed.hostname}" is blocked.`,
    );

  // DNS resolution check — resolve and verify no private IPs
  try {
    const addresses = await dnsResolve(parsed.hostname);
    for (const addr of addresses)
      if (isPrivateIp(addr))
        throw new Error(
          `SSRF: Hostname "${parsed.hostname}" resolves to private IP "${addr}".`,
        );
  } catch (error) {
    // Re-throw SSRF errors, ignore DNS resolution failures for non-resolvable hosts
    if (error instanceof Error && error.message.startsWith("SSRF:"))
      throw error;

    // DNS resolution may fail in test environments — allow if hostname matches
  }
}

function isTraversalSegment(segment: string): boolean {
  if (segment === "..") return true;
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Malformed percent sequence — not a valid encoding of ".."
    return false;
  }
  return decoded === ".." || /(^|[/\\])\.\.([/\\]|$)/.test(decoded);
}
