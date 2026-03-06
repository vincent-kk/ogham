/**
 * @file frontmatter.ts
 * @description Zod 기반 Frontmatter 스키마 — 모든 maencof 문서 공통 메타데이터
 */
import { z } from 'zod';

import { PersonSchema } from './person.js';

/** 서브레이어 Zod 스키마 */
const SubLayerSchema = z.enum([
  'relational',
  'structural',
  'topical',
  'buffer',
  'boundary',
]);

/** Frontmatter 기본 스키마 (superRefine 전) */
const FrontmatterBaseSchema = z.object({
  /** 최초 생성일 YYYY-MM-DD (변경 금지) */
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 마지막 수정일 YYYY-MM-DD (MCP 자동 갱신) */
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 태그 목록 (최소 1개 필수) */
  tags: z.array(z.string()).min(1),
  /** Layer 속성 (1-5) */
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
  /** Person 메타데이터 (L3A relational 문서 전용, 선택) */
  person: PersonSchema.optional(),
  /** Domain 이름 (모든 레이어, cross-layer 그룹핑용, 선택) */
  domain: z.string().optional(),
  /** Domain 유형 (선택) */
  domain_type: z.enum(['life', 'professional']).optional(),

  // ─── Sub-layer 확장 필드 ─────────────────────────────────
  /** 서브레이어 (L3: relational/structural/topical, L5: buffer/boundary) */
  sub_layer: SubLayerSchema.optional(),

  // L3A (relational) 전용
  /** 인물 참조 키 (person.name 기반) */
  person_ref: z.string().optional(),
  /** 신뢰 수준 (0.0~1.0) */
  trust_level: z.number().min(0).max(1).optional(),
  /** 전문 도메인 목록 */
  expertise_domains: z.array(z.string()).optional(),

  // L3B (structural) 전용
  /** 조직 유형 */
  org_type: z.enum(['company', 'community', 'team', 'institution']).optional(),
  /** 멤버십 상태 */
  membership_status: z.enum(['active', 'inactive', 'alumni']).optional(),
  /** Ba 컨텍스트 */
  ba_context: z.string().optional(),

  // L3C (topical) 전용
  /** 주제 카테고리 */
  topic_category: z.string().optional(),
  /** 성숙도 */
  maturity: z.enum(['seed', 'growing', 'mature', 'evergreen']).optional(),

  // L5-Buffer 전용
  /** 버퍼 유형 */
  buffer_type: z.enum(['inbox', 'unsorted', 'temp']).optional(),
  /** 승격 대상 레이어 */
  promotion_target: z.number().int().min(1).max(4).optional(),

  // L5-Boundary 전용
  /** 경계 객체 유형 */
  boundary_type: z.string().optional(),
  /** 연결 레이어 목록 */
  connected_layers: z.array(z.number().int().min(1).max(5)).optional(),
});

/** L3 서브레이어 값 목록 */
const L3_SUB_LAYERS = new Set(['relational', 'structural', 'topical']);
/** L5 서브레이어 값 목록 */
const L5_SUB_LAYERS = new Set(['buffer', 'boundary']);

/** Frontmatter Zod 스키마 */
export const FrontmatterSchema = FrontmatterBaseSchema.superRefine(
  (data, ctx) => {
    const { layer, sub_layer } = data;
    if (!sub_layer) return;

    // layer-sublayer 일관성 검증
    if (layer === 3 && !L3_SUB_LAYERS.has(sub_layer)) {
      ctx.addIssue({
        code: 'custom',
        message: `Layer 3 sub_layer must be relational/structural/topical, got '${sub_layer}'`,
        path: ['sub_layer'],
      });
      return;
    }
    if (layer === 5 && !L5_SUB_LAYERS.has(sub_layer)) {
      ctx.addIssue({
        code: 'custom',
        message: `Layer 5 sub_layer must be buffer/boundary, got '${sub_layer}'`,
        path: ['sub_layer'],
      });
      return;
    }
    if (layer !== 3 && layer !== 5 && sub_layer) {
      ctx.addIssue({
        code: 'custom',
        message: `sub_layer is only valid for Layer 3 or 5, got layer=${layer}`,
        path: ['sub_layer'],
      });
      return;
    }

    // 서브레이어 전용 필드 배타성 검증
    if (sub_layer === 'relational') {
      if (data.org_type) {
        ctx.addIssue({
          code: 'custom',
          message: 'org_type is exclusive to L3B (structural)',
          path: ['org_type'],
        });
      }
    }
    if (sub_layer === 'structural') {
      if (data.person_ref) {
        ctx.addIssue({
          code: 'custom',
          message: 'person_ref is exclusive to L3A (relational)',
          path: ['person_ref'],
        });
      }
    }
    if (sub_layer === 'buffer') {
      if (data.boundary_type) {
        ctx.addIssue({
          code: 'custom',
          message: 'boundary_type is exclusive to L5-Boundary',
          path: ['boundary_type'],
        });
      }
      if (data.connected_layers) {
        ctx.addIssue({
          code: 'custom',
          message: 'connected_layers is exclusive to L5-Boundary',
          path: ['connected_layers'],
        });
      }
    }
    if (sub_layer === 'boundary') {
      if (data.buffer_type) {
        ctx.addIssue({
          code: 'custom',
          message: 'buffer_type is exclusive to L5-Buffer',
          path: ['buffer_type'],
        });
      }
      if (data.promotion_target) {
        ctx.addIssue({
          code: 'custom',
          message: 'promotion_target is exclusive to L5-Buffer',
          path: ['promotion_target'],
        });
      }
    }
  },
);

/** Frontmatter 타입 */
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

/**
 * buildFrontmatter()가 자동 생성할 수 있는 키 목록.
 * content dedup 시 중복 감지 기준으로 사용된다.
 *
 * 새 키를 buildFrontmatter()에 추가할 때 이 배열도 함께 갱신할 것.
 */
export const AUTO_GENERATED_FM_KEYS = [
  'created',
  'updated',
  'tags',
  'layer',
  'sub_layer',
  'title',
  'source',
  'expires',
] as const;

export type AutoGeneratedFmKey = (typeof AUTO_GENERATED_FM_KEYS)[number];

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
