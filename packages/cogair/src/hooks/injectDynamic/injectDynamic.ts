import type { HookConfig, HookCounter } from '../shared/configTypes.js';

import { formatRatio } from './utils/formatRatio.js';

export function buildDynamicPayload(
  config: HookConfig,
  counter: HookCounter,
): string {
  const total = counter.gemini + counter.codex;
  const lines = ['[cogair] Live state', ''];

  if (total === 0) {
    lines.push('No calls this session yet.');
  } else {
    const r = formatRatio(
      { gemini: counter.gemini, codex: counter.codex },
      config.ratio,
    );
    lines.push(
      `Calls this session: gemini ${counter.gemini} · codex ${counter.codex} · total ${total}`,
    );
    lines.push(`Current ratio:      ${r.current}`);
    lines.push(`Target ratio:       ${r.target}`);
    lines.push(`Drift:              ${r.drift}   (target - current)`);
  }

  const noneActive =
    !config.ratio.gemini.enabled && !config.ratio.codex.enabled;
  if (noneActive) lines.push('Available providers: none — run /setup');

  return lines.join('\n');
}
