/**
 * @file frontmatter.ts
 * @description Zod 기반 Frontmatter 스키마 — 모든 maencof 문서 공통 메타데이터
 */
import { z } from 'zod';

import { PersonSchema } from './person.js';

/**
 * 서브레이어 Zod 스키마 — L3 전용. `SubLayer` 타입의 런타임 짝이자 허용값의 정본.
 *
 * frontmatter 검증뿐 아니라 MCP 도구의 `sub_layer` 입력 스키마도 여기서 파생한다.
 * 값 목록을 다른 곳에 리터럴로 다시 적으면 레이어 모델이 바뀔 때 그 자리만 남아
 * 폐기된 값을 계속 광고한다.
 */
export const SubLayerSchema = z.enum(['relational', 'structural', 'topical']);

/** YYYY-MM-DD 날짜 문자열 정본 — frontmatter 날짜 필드와 MCP 도구의 날짜 입력이 파생한다. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Domain 유형 허용값 정본. */
export const DomainTypeSchema = z.enum(['life', 'professional']);
/** Domain 유형. */
export type DomainType = z.infer<typeof DomainTypeSchema>;

/** 조직 유형(L3B) 허용값 정본. */
export const OrgTypeSchema = z.enum([
  'company',
  'community',
  'team',
  'institution',
]);
/** 조직 유형(L3B). */
export type OrgType = z.infer<typeof OrgTypeSchema>;

/** 멤버십 상태(L3B) 허용값 정본. */
export const MembershipStatusSchema = z.enum(['active', 'inactive', 'alumni']);
/** 멤버십 상태(L3B). */
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

/** 주제 성숙도(L3C) 허용값 정본. */
export const MaturitySchema = z.enum([
  'seed',
  'growing',
  'mature',
  'evergreen',
]);
/** 주제 성숙도(L3C). */
export type Maturity = z.infer<typeof MaturitySchema>;

/** L5 버퍼 항목 종류 허용값 정본. */
export const BufferTypeSchema = z.enum([
  'snippet',
  'conversation',
  'unclassified',
]);

/** L5 승격 대상 허용값 정본 — 서브레이어 이름 또는 'L2'. */
export const PromotionTargetSchema = z.enum([...SubLayerSchema.options, 'L2']);

/** 허브 문서 종류 허용값 정본. */
export const HubKindSchema = z.enum([
  'project_moc',
  'cross_domain',
  'synthesis',
  'study_hub',
]);

/** Frontmatter 기본 스키마 (superRefine 전) */
const FrontmatterBaseSchema = z.object({
  /** 최초 생성일 YYYY-MM-DD (변경 금지) */
  created: IsoDateSchema,
  /** 마지막 수정일 YYYY-MM-DD (MCP 자동 갱신) */
  updated: IsoDateSchema,
  /** 태그 목록 (최소 1개 필수) */
  tags: z.array(z.string()).min(1),
  /** Layer 속성 (1-5) */
  layer: z.number().int().min(1).max(5),
  /** 문서 제목 (선택) */
  title: z.string().optional(),
  /** 한 줄 요약 — L1 turn-context gist (선택). 존재 시 매 턴 주입되는 압축 요약. */
  gist: z.string().optional(),
  /** 외부 출처 (Layer 3용, 선택) */
  source: z.string().optional(),
  /** 만료일 YYYY-MM-DD (Layer 4용, 선택) */
  expires: IsoDateSchema.optional(),
  /** 아카이브 스텁 여부 — L4 만료 후 archiveExpired hook이 설정. 정본은 archive로 이동하고 이 문서는 연결 보존용 경량 스텁이 된다. */
  archived: z.boolean().optional(),
  /** 정본 원본의 archive 상대 경로 (archived=true일 때 유효) */
  archive_path: z.string().optional(),
  /** 증분 문서의 스레드 선언 (예: jira-gcc-3903) — 같은 키의 문서들은 검색에서 대표 1건으로 접힌다. 시드·태그 채널과 분리된 별도 필드. */
  cluster_key: z.string().min(1).optional(),
  /** 내재화 신뢰도 0.0~1.0 (Layer 3→2 전이 기준, 선택) */
  confidence: z.number().min(0).max(1).optional(),
  /** 세션별 참조 횟수 누적 (선택) */
  accessed_count: z.number().int().nonnegative().optional(),
  /** Lazy Scheduling 표현식 (선택) */
  schedule: z.string().optional(),
  /** Person 메타데이터 (L3A relational 문서 전용, 선택) */
  person: PersonSchema.optional(),
  /** 문서에서 언급된 인물 목록 (모든 레이어, person_ref와 별개) */
  mentioned_persons: z.array(z.string()).optional(),
  /** Domain 이름 (모든 레이어, cross-layer 그룹핑용, 선택) */
  domain: z.string().optional(),
  /** Domain 유형 (선택) */
  domain_type: DomainTypeSchema.optional(),

  // ─── Sub-layer 확장 필드 ─────────────────────────────────
  /** 서브레이어 (L3 전용: relational/structural/topical) */
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
  org_type: OrgTypeSchema.optional(),
  /** 멤버십 상태 */
  membership_status: MembershipStatusSchema.optional(),
  /** Ba 컨텍스트 */
  ba_context: z.string().optional(),

  // L3C (topical) 전용
  /** 주제 카테고리 */
  topic_category: z.string().optional(),
  /** 성숙도 */
  maturity: MaturitySchema.optional(),

  // L5 (임시 수용소) 전용
  /** 미분류 항목의 종류 */
  buffer_type: BufferTypeSchema.optional(),
  /** 승격 대상 — 레이어 번호가 아니라 서브레이어 이름이다(L3A/3B/3C를 구분해야 승격 규칙이 성립한다) */
  promotion_target: PromotionTargetSchema.optional(),
  /** 항목의 출처 서술 (예: "대화 중 멘션", "웹 스크랩") */
  source_context: z.string().optional(),

  // 허브 — 레이어와 직교하는 속성
  /** 이 문서가 교차 연결 허브인지 여부 */
  hub: z.boolean().optional(),
  /** 허브 문서의 종류 */
  hub_kind: HubKindSchema.optional(),
  /** 이 허브가 무엇을 통합하는지 한 줄 서술 (hub=true일 때 필수) */
  purpose: z.string().optional(),
});

/** Layer 5(임시 수용소) 에서만 유효한 필드 이름 */
const L5_ONLY_FIELDS = [
  'buffer_type',
  'promotion_target',
  'source_context',
] as const;

/** L3 하위 유형별 중첩 객체 외 전용 metadata와 오류 표기. */
const L3_SUB_LAYER_FIELD_GROUPS = [
  {
    subLayer: 'relational',
    label: 'L3A (relational)',
    fields: ['person_ref', 'trust_level', 'expertise_domains'],
  },
  {
    subLayer: 'structural',
    label: 'L3B (structural)',
    fields: ['org_type', 'membership_status', 'ba_context'],
  },
  {
    subLayer: 'topical',
    label: 'L3C (topical)',
    fields: ['topic_category', 'maturity'],
  },
] as const;

/** Frontmatter Zod 스키마 */
export const FrontmatterSchema = FrontmatterBaseSchema.superRefine(
  (data, ctx) => {
    const { layer, sub_layer } = data;

    // 서브레이어는 L3 전용 — L5 는 평면 구조라 서브레이어를 갖지 않는다
    if (sub_layer && layer !== 3)
      ctx.addIssue({
        code: 'custom',
        message: `sub_layer is only valid for Layer 3, got layer=${layer}`,
        path: ['sub_layer'],
      });

    // L5 전용 필드는 다른 레이어에서 의미가 없다
    if (layer !== 5)
      for (const field of L5_ONLY_FIELDS)
        if (data[field] !== undefined)
          ctx.addIssue({
            code: 'custom',
            message: `${field} is exclusive to Layer 5 (unclassified buffer)`,
            path: [field],
          });

    // 허브는 레이어와 직교하지만, 임시 수용소는 다리가 되지 않는다
    if (data.hub === true && layer === 5)
      ctx.addIssue({
        code: 'custom',
        message: 'Layer 5 documents cannot be hubs — a buffer is not a bridge',
        path: ['hub'],
      });

    // 허브의 존재 이유는 frontmatter 가 답해야 한다 (본문을 열지 않는 소비자를 위해)
    if (data.hub === true && !data.purpose)
      ctx.addIssue({
        code: 'custom',
        message: 'hub requires purpose — state in one line what this hub joins',
        path: ['purpose'],
      });

    // 반쪽 선언 차단: 허브 속성만 있고 hub 선언이 없는 문서
    if (data.hub !== true && (data.hub_kind || data.purpose))
      ctx.addIssue({
        code: 'custom',
        message: 'hub_kind and purpose require hub: true',
        path: ['hub'],
      });

    // 서브레이어 전용 필드 배타성 검증
    for (const group of L3_SUB_LAYER_FIELD_GROUPS) {
      if (layer === 3 && sub_layer === group.subLayer) continue;
      for (const field of group.fields)
        if (data[field] !== undefined)
          ctx.addIssue({
            code: 'custom',
            message: `${field} is exclusive to ${group.label}`,
            path: [field],
          });
    }
  },
);

/** Frontmatter 타입 */
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

/** validateFrontmatter 결과 (write-path 게이트 + read-path 검증 공용) */
export type ValidateFrontmatterResult =
  { ok: true; data: Frontmatter } | { ok: false; errors: string[] };

/**
 * Frontmatter 객체 검증 — read-path와 write-path 공용 단일 진입점.
 * 에러 포맷은 document-parser.extractFrontmatter와 동일하다.
 */
export function validateFrontmatter(obj: unknown): ValidateFrontmatterResult {
  const result = FrontmatterSchema.safeParse(obj);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    ),
  };
}

export { AUTO_GENERATED_FM_KEYS } from '../constants/validationSets.js';

export type AutoGeneratedFmKey =
  | 'created'
  | 'updated'
  | 'tags'
  | 'layer'
  | 'sub_layer'
  | 'title'
  | 'source'
  | 'expires'
  | 'mentioned_persons';

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
