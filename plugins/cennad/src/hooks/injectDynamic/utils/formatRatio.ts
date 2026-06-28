import { signed } from './signed.js';

export interface RatioLines {
  current: string;
  target: string;
  drift: string;
}

export interface RatioLane {
  name: string;
  count: number;
  // Configured ratio weight (the raw percent), 0 when the provider is disabled.
  weight: number;
}

// Renders current/target/drift across N provider lanes. current% is each lane's
// share of total calls; target% is the lane's configured weight (raw, 0 when
// disabled); drift = target - current.
export function formatRatio(lanes: RatioLane[]): RatioLines {
  const countTotal = lanes.reduce((sum, l) => sum + l.count, 0);
  const curr = (l: RatioLane): number =>
    countTotal === 0 ? 0 : Math.round((l.count / countTotal) * 100);
  const targ = (l: RatioLane): number => l.weight;
  return {
    current: lanes.map((l) => `${l.name} ${curr(l)}%`).join(' · '),
    target: lanes.map((l) => `${l.name} ${targ(l)}%`).join(' · '),
    drift: lanes
      .map((l) => `${l.name} ${signed(targ(l) - curr(l))}`)
      .join(' · '),
  };
}
