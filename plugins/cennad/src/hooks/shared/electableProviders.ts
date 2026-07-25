import type { Ratio } from './configTypes.js';
import { type HookProvider, PROVIDER_ORDER } from './providerOrder.js';

// Providers the hooks may elect on their own, in priority order.
//
// Narrower than "enabled": a provider stays enabled — and therefore a
// crosscheck participant and an explicit-call target — while being excluded from
// auto-routing, either because the user marked it crosscheck_only or because it
// is the host's own model.
export function electableProviders(
  ratio: Ratio,
  self: HookProvider,
): HookProvider[] {
  return PROVIDER_ORDER.filter(
    (p) => ratio[p].enabled && !ratio[p].crosscheck_only && p !== self,
  );
}
