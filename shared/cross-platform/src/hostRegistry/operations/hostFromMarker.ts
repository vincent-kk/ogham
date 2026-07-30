import { HOSTS } from "./registry.js";
import type { Host, KnownHost } from "./types.js";

/**
 * Resolve a host from its marker value alone.
 *
 * Absence means Claude: its `.mcp.json` ships unmodified, so it carries no marker.
 * A marker present but unrecognised resolves to `unknown` rather than defaulting to
 * Claude — assuming the Claude contract on a host that does not honour it is the
 * silent misbehaviour the host registry exists to prevent.
 */
export function hostFromMarker(marker: string | undefined): Host {
  if (!marker) return "claude";

  for (const [id, descriptor] of Object.entries(HOSTS))
    if (descriptor.marker === marker) return id as KnownHost;

  return "unknown";
}
