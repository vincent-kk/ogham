/**
 * @file session.ts
 * @description 세션 타입 — SessionSummary, UsageStats, SkillUsageEntry, AgentUsageEntry
 */

import type { AgentRole } from './agent.js';

/** 스킬 사용 기록 */
export interface SkillUsageEntry {
  /** 스킬 이름 */
  skillName: string;
  /** 실행 횟수 */
  count: number;
  /** 마지막 실행 시간 */
  lastUsedAt: string;
  /** 성공 횟수 */
  successCount: number;
}

/** 에이전트 사용 기록 */
export interface AgentUsageEntry {
  role: AgentRole;
  /** 실행 횟수 */
  count: number;
  /** 마지막 실행 시간 */
  lastUsedAt: string;
  /** 성공 횟수 */
  successCount: number;
  /** 자율 실행 횟수 (승인 없이) */
  autonomousCount: number;
}

/** 누적 사용 통계 */
export interface UsageStats {
  /** 총 상호작용 횟수 */
  totalInteractions: number;
  /** 성공 횟수 */
  successCount: number;
  /** 스킬별 사용 기록 */
  skillUsage: SkillUsageEntry[];
  /** 에이전트별 사용 기록 */
  agentUsage: AgentUsageEntry[];
  /** MCP 도구별 호출 횟수 */
  mcpToolCalls: Record<string, number>;
  /** 통계 시작일 */
  since: string;
  /** 마지막 업데이트 */
  updatedAt: string;
}

/** 세션 요약 */
export interface SessionSummary {
  /** 세션 ID */
  sessionId: string;
  /** 세션 시작 시간 */
  startedAt: string;
  /** 세션 종료 시간 */
  endedAt?: string;
  /** 세션 중 생성된 문서 수 */
  documentsCreated: number;
  /** 세션 중 수정된 문서 수 */
  documentsUpdated: number;
  /** 세션 중 참조된 문서 경로 */
  documentsAccessed: string[];
  /** 세션 중 실행된 스킬 */
  skillsUsed: string[];
  /** 세션 중 실행된 에이전트 */
  agentsUsed: AgentRole[];
  /** Layer 4 문서 중 전이 후보 목록 */
  transitionCandidates: string[];
}
