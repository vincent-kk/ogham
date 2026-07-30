import { hostFromMarker } from "../operations/hostFromMarker.js";
import { HOST_MARKER_ENV, HOSTS } from "../operations/registry.js";
import type { Host, KnownHost } from "../operations/types.js";

export function resolveRuntimeHost(
  env: Readonly<Record<string, string | undefined>>,
): Host {
  const marker = env[HOST_MARKER_ENV];
  if (marker) return hostFromMarker(marker);

  const inferred = (
    Object.entries(HOSTS) as [KnownHost, (typeof HOSTS)[KnownHost]][]
  )
    .filter(([, descriptor]) => {
      const signal = descriptor.hookSignalEnv;
      return signal !== undefined && Boolean(env[signal]);
    })
    .map(([host]) => host);

  if (inferred.length === 0) return "claude";
  return inferred.length === 1 ? inferred[0] : "unknown";
}
