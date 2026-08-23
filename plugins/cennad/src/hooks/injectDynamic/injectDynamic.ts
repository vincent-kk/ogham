import type { HookConfig, HookCounter } from '../shared/configTypes.js';
import { electableProviders } from '../shared/electableProviders.js';
import { type HookProvider, PROVIDER_ORDER } from '../shared/providerOrder.js';

import { matchDomain } from './utils/matchDomain.js';
import { matchLine } from './utils/matchLine.js';
import { nudgeLine } from './utils/nudgeLine.js';
import { type RatioLane, underShare } from './utils/underShare.js';

export function buildDynamicPayload(
  config: HookConfig,
  counter: HookCounter,
  prompt: string,
  self: HookProvider,
): string {
  if (!PROVIDER_ORDER.some((p) => config.ratio[p].enabled))
    return '[cennad] No provider enabled — run /cennad:setup.';
  if (counter.status === 'unidentified') return '';

  const electable = electableProviders(config.ratio, self);
  const lanes: RatioLane[] = PROVIDER_ORDER.map((p) => ({
    name: p,
    count: counter[p],
    weight: config.ratio[p].enabled ? config.ratio[p].value : 0,
    electable: electable.includes(p),
  }));
  const total = lanes.reduce((sum, lane) => sum + lane.count, 0);

  let state: string;
  if (counter.status !== 'measured')
    state = `[cennad] Delegation counts unavailable (${counter.status}).`;
  else {
    const gap = underShare(lanes);
    state =
      total === 0
        ? '[cennad] No delegations yet this session.'
        : `[cennad] Calls: ${lanes
            .map((lane) => `${lane.name} ${lane.count}`)
            .join(' · ')} (total ${total})${gap === '' ? '' : ` · ${gap}`}`;
  }

  if (electable.length === 0)
    return `${state}\nEvery enabled provider is crosscheck-only here; nothing is auto-routed.`;

  const lines = [state, nudgeLine(config.intervention_strength, electable)];
  const match = matchDomain(prompt, config.keywords, electable);
  if (match) lines.push(matchLine(config.intervention_strength, match));
  return lines.join('\n');
}
