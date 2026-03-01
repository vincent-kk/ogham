/**
 * @file companion.ts
 * @description AI Companion Identity Zod 스키마 (MCP 서버 tools용)
 *
 * 수동 타입 가드는 companion-guard.ts에 분리되어 있다.
 * session-start hook은 반드시 companion-guard.ts에서 import할 것.
 */
import { z } from 'zod';

/** AI 동반자 성격 스키마 */
export const CompanionPersonalitySchema = z.object({
  tone: z.string().min(1),
  approach: z.string().min(1),
  traits: z.array(z.string().min(1)).min(1),
});

/** AI 동반자 자아 정체성 스키마 */
export const CompanionIdentitySchema = z.object({
  schema_version: z.literal(1),
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

export type CompanionPersonality = z.infer<typeof CompanionPersonalitySchema>;
export type CompanionIdentity = z.infer<typeof CompanionIdentitySchema>;
