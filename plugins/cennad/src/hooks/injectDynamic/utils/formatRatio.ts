import { signed } from './signed.js';

export interface RatioLines {
  current: string;
  target: string;
  drift: string;
}

// Renders current/target/drift for the codex vs active-Google-engine pair.
// gemini and antigravity are mutually exclusive, so only one Google engine is
// ever shown (labelled by `googleName`).
export function formatRatio(
  current: { google: number; codex: number },
  target: { google: number; codex: number },
  googleName: string,
): RatioLines {
  const total = current.google + current.codex;
  const currG = total === 0 ? 0 : Math.round((current.google / total) * 100);
  const currC = total === 0 ? 0 : 100 - currG;

  return {
    current: `${googleName} ${currG}% · codex ${currC}%`,
    target: `${googleName} ${target.google}% · codex ${target.codex}%`,
    drift: `${googleName} ${signed(target.google - currG)} · codex ${signed(target.codex - currC)}`,
  };
}
