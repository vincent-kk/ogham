import { HOST_MARKER_ENV, hostFromMarker } from "../hostRegistry/index.js";

import type { Host } from "./types.js";

/**
 * The host that launched this process, from the marker the non-Claude adapters
 * inject into their MCP declaration.
 *
 * Marker-only on purpose. This module is documented MCP-only (hooks receive no
 * marker and must not consume it), so the hook-side signals that
 * `resolveHostDescriptor` also weighs would be dead weight here — and answering
 * from a signal this module's callers never see would make `detectHost` mean
 * something different from what its consumers assume.
 */
export function detectHost(): Host {
  return hostFromMarker(process.env[HOST_MARKER_ENV]);
}
