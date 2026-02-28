/**
 * @file frontmatter.ts
 * @description Zod 기반 Frontmatter 스키마 — 모든 coffaen 문서 공통 메타데이터
 */
import { z } from 'zod';

import { PersonSchema } from './person.js';

/** Frontmatter Zod 스키마 */
export const FrontmatterSchema = z.object({
  /** 최초 생성일 YYYY-MM-DD (변경 금지) */
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 마지막 수정일 YYYY-MM-DD (MCP 자동 갱신) */
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 태그 목록 (최소 1개 필수) */
  tags: z.array(z.string()).min(1),
  /** Layer 속성 (1-4) */
  layer: z.number().int().min(1).max(5),
  /** 문서 제목 (선택) */
  title: z.string().optional(),
  /** 외부 출처 (Layer 3용, 선택) */
  source: z.string().optional(),
  /** 만료일 YYYY-MM-DD (Layer 4용, 선택) */
  expires: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** 내재화 신뢰도 0.0~1.0 (Layer 3→2 전이 기준, 선택) */
  confidence: z.number().min(0).max(1).optional(),
  /** 세션별 참조 횟수 누적 (선택) */
  accessed_count: z.number().int().nonnegative().optional(),
  /** Lazy Scheduling 표현식 (선택) */
  schedule: z.string().optional(),
  /** Person 메타데이터 (L4 person 문서 전용, 선택) */
  person: PersonSchema.optional(),
  /** Domain 이름 (모든 레이어, cross-layer 그룹핑용, 선택) */
  domain: z.string().optional(),
  /** Domain 유형 (선택) */
  domain_type: z.enum(['life', 'professional']).optional(),
});

/** Frontmatter 타입 */
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

/** Frontmatter 파싱 결과 */
export interface FrontmatterParseResult {
  /** 파싱 성공 여부 */
  success: boolean;
  /** 파싱된 Frontmatter (성공 시) */
  data?: Frontmatter;
  /** 검증 오류 목록 (실패 시) */
  errors?: string[];
  /** 원본 YAML 문자열 */
  raw: string;
}
