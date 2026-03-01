/**
 * @file domain.ts
 * @description Domain 모델 Zod 스키마 — cross-layer 가상 그룹핑용
 */
import { z } from 'zod';

/** 생활 도메인 열거 */
export const LifeDomainEnum = z.enum([
  'health', // 건강/운동
  'finance', // 재정/투자
  'relationships', // 대인관계
  'career', // 경력/직업
  'education', // 학습/교육
  'hobby', // 취미/여가
  'spirituality', // 영성/철학
  'environment', // 생활환경
]);

/** DomainSchema — Domain 전용 메타데이터 */
export const DomainSchema = z.object({
  /** 도메인 이름 (필수) */
  domain_name: z.string().min(1),
  /** 도메인 유형 (필수) */
  domain_type: z.enum(['life', 'professional']),
  /** 생활 도메인 세부 분류 (domain_type이 'life'일 때 사용, 선택) */
  life_domain: LifeDomainEnum.optional(),
  /** 전문 분야명 (domain_type이 'professional'일 때 사용, 선택) */
  professional_field: z.string().optional(),
  /** 전문 분야 역할 (선택) */
  professional_role: z.string().optional(),
  /** 우선순위 1-5 (선택) */
  priority: z.number().int().min(1).max(5).optional(),
  /** 도메인 설명 (선택) */
  description: z.string().optional(),
});

/** Domain 타입 */
export type Domain = z.infer<typeof DomainSchema>;

/** 생활 도메인 타입 */
export type LifeDomain = z.infer<typeof LifeDomainEnum>;
