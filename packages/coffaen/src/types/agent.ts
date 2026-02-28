/**
 * @file agent.ts
 * @description 에이전트 타입 — AgentRole, AgentAccessMatrix, TransitionDirective, LayerPermission
 */

import type { Layer, AutonomyLevel } from './common.js';

/** 에이전트 역할 */
export type AgentRole =
  | 'memory-organizer'
  | 'knowledge-connector'
  | 'schedule-runner'
  | 'identity-guardian';

/** Layer별 허용 작업 */
export interface LayerPermission {
  /** 허용 Layer 목록 */
  layers: Layer[];
  /** 읽기 허용 */
  read: boolean;
  /** 쓰기 허용 */
  write: boolean;
  /** 허용 작업 목록 */
  allowed_operations: AgentOperation[];
  /** 금지 작업 목록 */
  forbidden_operations: AgentOperation[];
}

/** 에이전트 작업 유형 */
export type AgentOperation =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'move'
  | 'link'
  | 'bulk-modify';

/** 에이전트 접근 매트릭스 */
export interface AgentAccessMatrix {
  role: AgentRole;
  /** Layer별 권한 */
  permissions: Partial<Record<Layer, LayerPermission>>;
  /** 필요한 최소 Autonomy Level */
  requiredAutonomyLevel: AutonomyLevel;
}

/** 전이 지시어 (Seam Interface) — Layer 간 문서 이동 요청 */
export interface TransitionDirective {
  /** 전이 대상 문서 경로 */
  path: string;
  /** 현재 Layer */
  fromLayer: Layer;
  /** 목표 Layer */
  toLayer: Layer;
  /** 전이 사유 */
  reason: string;
  /** 신뢰도 (Layer 3→2 전이 시 필요) */
  confidence?: number;
  /** 전이 요청 시간 */
  requestedAt: string;
  /** 전이 요청 주체 */
  requestedBy: AgentRole | 'user' | 'system';
}

/** 에이전트 실행 결과 */
export interface AgentExecutionResult {
  role: AgentRole;
  success: boolean;
  /** 수행된 작업 목록 */
  actions: string[];
  /** 생성된 TransitionDirective 목록 */
  transitions: TransitionDirective[];
  /** 오류 메시지 (실패 시) */
  error?: string;
  /** 실행 시간 (ms) */
  durationMs: number;
}
