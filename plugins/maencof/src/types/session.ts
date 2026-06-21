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

/**
 * 단일 세션 레코드 — `dailynotes/sessions/YYYY-MM-DD.json` 의 `sessions[sessionId]` 값.
 *
 * SessionStart 에 생성(`usageBaseline` 스냅샷 포함)되고 SessionEnd 에 마감된다.
 * 마감 시 baseline 대비 누적 통계 차분으로 `vaultOps` 를 산출하고 `usageBaseline` 은 제거한다.
 * `endedAt` 이 없으면 아직 진행 중이거나 비정상 종료된 세션이다.
 */
export interface SessionRecord {
  /** 세션 ID — 일자 파일 내 키와 동일 */
  sessionId: string;
  /** 세션 시작 시각 (ISO) */
  startedAt: string;
  /** 세션 종료 시각 (ISO). 미마감 세션은 부재 */
  endedAt?: string;
  /** 세션 중 실행된 스킬 */
  skillsUsed: string[];
  /** 세션 중 수정된 파일 */
  filesModified: string[];
  /** 이 세션 동안의 볼트 도구 호출 차분 (0 초과 항목만) */
  vaultOps?: Record<string, number>;
  /** SessionStart 시점 누적 통계 스냅샷 — 마감 시 차분 계산 후 제거 */
  usageBaseline?: Record<string, number>;
}

/**
 * 일자별 세션 로그 파일 — `dailynotes/sessions/YYYY-MM-DD.json`.
 *
 * 하루 1파일로 세션을 `session_id` 키 맵에 보관해 전수조사 없이 직접 조회한다.
 */
export interface SessionDayLog {
  /** YYYY-MM-DD */
  date: string;
  /** session_id → 세션 레코드 */
  sessions: Record<string, SessionRecord>;
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
