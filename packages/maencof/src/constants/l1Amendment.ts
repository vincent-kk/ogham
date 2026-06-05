import type { L1ChangeReason } from '../types/l1Amendment.js';

/** change_reason 별 guardian 검증 강도 */
export const L1_VERIFICATION_INTENSITY: Record<
  L1ChangeReason,
  'LOW' | 'MEDIUM' | 'HIGH'
> = {
  error_correction: 'LOW',
  info_update: 'LOW',
  consolidation: 'MEDIUM',
  identity_evolution: 'HIGH',
  reinterpretation: 'HIGH',
};
