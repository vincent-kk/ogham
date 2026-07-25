import { resolveHostDescriptor } from '@ogham/cross-platform/host-registry/descriptor';
import { HOSTS } from '@ogham/cross-platform/host-registry/hosts';

import type { HookProvider } from './providerOrder.js';

// The provider a session is already running on. It is dropped from auto-routing
// so a host never elects its own model — it stays reachable through
// /cennad:crosscheck and explicit calls.
//
// resolveHostDescriptor is the hook-side resolver: hook processes receive no
// OGHAM_HOST marker, so it falls back to each host's measured hook signal.
// detectHost() is marker-only and would answer "claude" in every hook process.
export function selfProvider(
  env: Record<string, string | undefined> = process.env,
): HookProvider {
  const { marker } = resolveHostDescriptor(env);
  if (marker === HOSTS.codex.marker) return 'codex';
  if (marker === HOSTS.agy.marker) return 'antigravity';
  return 'claude';
}
