import type { HookConfig, HookCounter } from '../shared/configTypes.js';
import { PROVIDER_ORDER } from '../shared/providerOrder.js';

import { type RatioLane, formatRatio } from './utils/formatRatio.js';

export function buildDynamicPayload(
  config: HookConfig,
  counter: HookCounter,
): string {
  const lanes: RatioLane[] = PROVIDER_ORDER.map((p) => ({
    name: p,
    count: counter[p],
    weight: config.ratio[p].enabled ? config.ratio[p].value : 0,
  }));
  const total = lanes.reduce((sum, l) => sum + l.count, 0);
  const anyEnabled = PROVIDER_ORDER.some((p) => config.ratio[p].enabled);

  const lines = ['[cennad] Live state', ''];

  if (total === 0) {
    lines.push('No calls this session yet.');
  } else {
    const r = formatRatio(lanes);
    lines.push(
      `Calls this session: ${lanes
        .map((l) => `${l.name} ${l.count}`)
        .join(' · ')} · total ${total}`,
    );
    lines.push(`Current ratio:      ${r.current}`);
    lines.push(`Target ratio:       ${r.target}`);
    lines.push(`Drift:              ${r.drift}   (target - current)`);
  }

  if (!anyEnabled) {
    lines.push('Available providers: none — run /setup');
  }

  return lines.join('\n');
}
