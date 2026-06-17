import { activeGoogleEngine } from '../shared/activeGoogleEngine.js';
import type { HookConfig, HookCounter } from '../shared/configTypes.js';

import { formatRatio } from './utils/formatRatio.js';

export function buildDynamicPayload(
  config: HookConfig,
  counter: HookCounter,
): string {
  const google = activeGoogleEngine(config);
  const googleName = google ?? 'gemini/antigravity';
  const googleCount = google ? counter[google] : 0;
  const total = googleCount + counter.codex;
  const lines = ['[cennad] Live state', ''];

  if (total === 0) {
    lines.push('No calls this session yet.');
  } else {
    const r = formatRatio(
      { google: googleCount, codex: counter.codex },
      {
        google:
          google && config.ratio[google].enabled
            ? config.ratio[google].value
            : 0,
        codex: config.ratio.codex.enabled ? config.ratio.codex.value : 0,
      },
      googleName,
    );
    lines.push(
      `Calls this session: ${googleName} ${googleCount} · codex ${counter.codex} · total ${total}`,
    );
    lines.push(`Current ratio:      ${r.current}`);
    lines.push(`Target ratio:       ${r.target}`);
    lines.push(`Drift:              ${r.drift}   (target - current)`);
  }

  if (!google && !config.ratio.codex.enabled) {
    lines.push('Available providers: none — run /setup');
  }

  return lines.join('\n');
}
