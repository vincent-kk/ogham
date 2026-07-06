/**
 * @file companion.ts
 * @description AI Companion Identity Zod 스키마 (MCP 서버 tools용).
 *
 * `CompanionIdentitySchema`가 정본(schema_version 2). 레거시 `CompanionIdentityV1Schema`는
 * 마이그레이션 입력 검증용으로 보존한다. 수동(Zod-free) 타입 가드는
 * companionGuard.ts에 분리되어 있으며, hook 번들은 반드시 그쪽을 import한다.
 */
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// v1 (legacy — 마이그레이션 입력 검증 전용, 삭제 금지)
// ─────────────────────────────────────────────────────────────────────────────

/** v1 AI 동반자 성격 스키마 */
export const CompanionPersonalitySchema = z.object({
  tone: z.string().min(1),
  approach: z.string().min(1),
  traits: z.array(z.string().min(1)).min(1),
});

/** v1 AI 동반자 자아 정체성 스키마 (고정 8필드) */
export const CompanionIdentityV1Schema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  personality: CompanionPersonalitySchema,
  principles: z.array(z.string().min(1)).min(1),
  taboos: z.array(z.string().min(1)).min(1),
  origin_story: z.string().min(1),
  greeting: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 정본 (canonical — 균일한 section 배열로 임의 캐릭터 축 확장)
// ─────────────────────────────────────────────────────────────────────────────

/** 섹션 주입 채널 — 세션시작 / 매 턴 / 양쪽 */
export const CompanionInjectEnum = z.enum(['session', 'turn', 'both']);

/**
 * 섹션 본문 필드(detail·brief). 단일 문자열 또는 문자열 배열을 허용해 저작 시
 * 여러 항목을 배열로 나눠 쓸 수 있다. 배열은 렌더 시점에 `|`로 join된다.
 */
export const CompanionSectionTextSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

/**
 * 캐릭터의 한 축. `key`는 고유 식별자이자 렌더 태그명.
 * `salience`는 태그 내 배치 순서(내림차순=앞)일 뿐 런타임 컷 기준이 아니다.
 * `brief`가 있으면 매 턴엔 brief, 세션엔 detail을 사용한다.
 * `detail`·`brief`는 문자열 또는 문자열 배열(렌더 시 `|` join)이다.
 */
export const CompanionSectionSchema = z.object({
  key: z.string().min(1),
  inject: CompanionInjectEnum,
  salience: z.number().int().min(1).max(5),
  detail: CompanionSectionTextSchema,
  brief: CompanionSectionTextSchema.optional(),
  title: z.string().min(1).optional(),
});

/**
 * 정본 AI 동반자 자아 정체성 스키마. 코어는 기능적 필드(name·greeting)만 —
 * role을 포함한 모든 캐릭터 축은 균일 `sections`로 표현한다(코드 수정 없이 축 확장).
 */
export const CompanionIdentitySchema = z.object({
  schema_version: z.literal(2),
  name: z.string().min(1),
  greeting: z.string().min(1),
  sections: z.array(CompanionSectionSchema).min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CompanionPersonality = z.infer<typeof CompanionPersonalitySchema>;
export type CompanionIdentityV1 = z.infer<typeof CompanionIdentityV1Schema>;
export type CompanionInject = z.infer<typeof CompanionInjectEnum>;
export type CompanionSectionText = z.infer<typeof CompanionSectionTextSchema>;
export type CompanionSection = z.infer<typeof CompanionSectionSchema>;
export type CompanionIdentity = z.infer<typeof CompanionIdentitySchema>;
