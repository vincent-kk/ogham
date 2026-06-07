import { PHASE_ORDER } from '../../constants/index.js';
import type { PhaseName } from '../../types/state.js';

export function advancePhase(current: PhaseName): PhaseName {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx < PHASE_ORDER.length - 1) {
    return PHASE_ORDER[idx + 1]!;
  }
  return current;
}
