import type { HookConfig } from '../shared/configTypes.js';
import { electableProviders } from '../shared/electableProviders.js';
import { type HookProvider, PROVIDER_ORDER } from '../shared/providerOrder.js';

import { domainLines } from './utils/domainLines.js';
import { routingStance } from './utils/routingStance.js';
import { strengthLabel } from './utils/strengthLabel.js';

export function buildStaticPayload(
  config: HookConfig,
  self: HookProvider,
): string {
  const r = config.ratio;
  const active = PROVIDER_ORDER.filter((p) => r[p].enabled);
  const electable = electableProviders(r, self);
  const ratioLine = PROVIDER_ORDER.map((p) => `${p} ${r[p].value}%`).join(
    ' · ',
  );
  const strength = config.intervention_strength;
  const domains = domainLines(config.keywords, active, electable, self);

  const closing =
    active.length === 0
      ? ['- Run /cennad:setup to enable a provider before delegating.']
      : electable.length === 0
        ? [
            '- Nothing is auto-routed here; use `/cennad:crosscheck` or name a provider yourself.',
          ]
        : [
            ...routingStance(strength),
            '- Dispatch through the skills above; never invoke CLI binaries directly.',
          ];

  return [
    '[cennad] Static policy',
    '',
    `Provider ratio: ${ratioLine}`,
    `Active providers: ${active.length === 0 ? 'none — run /setup' : active.join(', ')}`,
    `Auto-routing: ${electable.length === 0 ? 'none — every enabled provider is crosscheck-only' : electable.join(', ')}`,
    `Intervention strength: ${strength} (${strengthLabel(strength)})`,
    '',
    ...(domains.length === 0 ? [] : [...domains, '']),
    'Routing guidance',
    `- Option flags:        ${JSON.stringify(config.option_flags)}`,
    ...closing,
  ].join('\n');
}
