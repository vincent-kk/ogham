import { HOST_MARKER_ENV, HOSTS } from "./registry.js";
import type { HostDescriptor } from "./types.js";

/**
 * Resolve the descriptor for the host running this process, from either signal.
 *
 * Two process kinds carry two different signals. MCP servers get the marker the
 * adapter injected; hook processes get no marker at all, and are identified by a
 * host's `hookSignalEnv` instead. Anything deciding where state lives runs in both
 * kinds, so it must consult both.
 *
 * A marker present at all suppresses the hook-signal pass: a marker is a statement
 * and a hook signal is an inference, and the two must not be able to combine into a
 * host neither of them named. An unrecognised marker therefore lands on Claude's
 * channel rather than sniffing further.
 *
 * Deliberately does not route through `hostFromMarker`: that one answers a
 * different question (which host, marker only) and keeping them apart lets it stay
 * out of hook bundles, which import this file directly.
 */
export function resolveHostDescriptor(
  env: Record<string, string | undefined>,
): HostDescriptor {
  const marker = env[HOST_MARKER_ENV];

  const match = Object.values(HOSTS).find((descriptor) =>
    marker
      ? descriptor.marker === marker
      : descriptor.hookSignalEnv && env[descriptor.hookSignalEnv],
  );

  return match ?? HOSTS.claude;
}
