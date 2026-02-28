/**
 * @file person.ts
 * @description Person 모델 Zod 스키마 — L4 관계 관리용
 */
import { z } from 'zod';

/** 관계 유형 (방향성 결정에 사용) */
export const RelationshipTypeEnum = z.enum([
  'friend', // 대칭 (양방향)
  'family', // 대칭 (양방향)
  'colleague', // 대칭 (양방향)
  'mentor', // 비대칭 (단방향: 나 -> 멘토)
  'mentee', // 비대칭 (단방향: 나 -> 멘티)
  'acquaintance', // 대칭 (양방향)
]);

/** 대칭 관계 유형 목록 (양방향 엣지 생성용) */
export const SYMMETRIC_RELATIONSHIPS = [
  'friend',
  'family',
  'colleague',
  'acquaintance',
] as const;

/** PersonSchema — Person 전용 메타데이터 */
export const PersonSchema = z.object({
  /** 사람 이름 (필수) */
  name: z.string().min(1),
  /** 관계 유형 (필수) */
  relationship_type: RelationshipTypeEnum,
  /** 친밀도 (필수, 1-5 정수: 1=낮음, 5=매우 높음) */
  intimacy_level: z.number().int().min(1).max(5),
  /** 상호작용 빈도 (선택: daily, weekly, monthly, quarterly, yearly) */
  interaction_frequency: z
    .enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
    .optional(),
  /** 관계 시작일 YYYY-MM-DD (선택) */
  relationship_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** 성격 유형 자유텍스트 (선택) */
  personality_type: z.string().optional(),
  /** MBTI (선택) */
  mbti: z
    .string()
    .regex(/^[EI][SN][TF][JP]$/i)
    .optional(),
  /** 커뮤니케이션 스타일 (선택) */
  communication_style: z.string().optional(),
  /** 선호사항/관심사 목록 (선택) */
  preferences: z.array(z.string()).optional(),
  /** 자유 메모 (선택) */
  notes: z.string().optional(),
});

/** Person 타입 */
export type Person = z.infer<typeof PersonSchema>;

/** 관계 유형 타입 */
export type RelationshipType = z.infer<typeof RelationshipTypeEnum>;
