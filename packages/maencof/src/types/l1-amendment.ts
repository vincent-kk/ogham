/**
 * @file l1-amendment.ts
 * @description L1 Core Identity 절차적 수정 관련 타입 정의
 */
import { z } from 'zod';

/** L1 수정 사유 대분류 */
export const L1ChangeReasonSchema = z.enum([
  'identity_evolution',
  'error_correction',
  'info_update',
  'consolidation',
  'reinterpretation',
]);

export type L1ChangeReason = z.infer<typeof L1ChangeReasonSchema>;

/** change_reason별 guardian 검증 강도 */
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

/** L1 수정 감사 로그 레코드 */
export interface L1AmendmentRecord {
  timestamp: string;
  path: string;
  change_reason: L1ChangeReason;
  justification: string;
  change_type: 'content' | 'frontmatter' | 'both';
  snapshot_before: string;
  diff_summary: string;
  affected_areas?: string[];
}
