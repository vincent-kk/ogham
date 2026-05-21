import type { Ratio } from '../../shared/configTypes.js';

import { signed } from './signed.js';

export interface RatioLines {
  current: string;
  target: string;
  drift: string;
}

export function formatRatio(
  counter: { gemini: number; codex: number },
  ratio: Ratio,
): RatioLines {
  const total = counter.gemini + counter.codex;
  const currG = total === 0 ? 0 : Math.round((counter.gemini / total) * 100);
  const currC = total === 0 ? 0 : 100 - currG;

  const tgtG = ratio.gemini.enabled ? ratio.gemini.value : 0;
  const tgtC = ratio.codex.enabled ? ratio.codex.value : 0;

  return {
    current: `gemini ${currG}% · codex ${currC}%`,
    target: `gemini ${tgtG}% · codex ${tgtC}%`,
    drift: `gemini ${signed(tgtG - currG)} · codex ${signed(tgtC - currC)}`,
  };
}
