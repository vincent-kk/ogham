/**
 * @file manage.ts
 * @description 관리 타입 — ManageMode, DisabledRegistry, SkillLifecycleAction
 */

/** 관리 모드 */
export type ManageMode =
  | 'enable'
  | 'disable'
  | 'status'
  | 'reset'
  | 'rebuild-index'
  | 'emergency-lock'
  | 'emergency-unlock';

/** 스킬 라이프사이클 액션 */
export type SkillLifecycleAction = 'enable' | 'disable' | 'reload';

/** 비활성화 레지스트리 항목 */
export interface DisabledRegistryEntry {
  /** 비활성화된 항목 이름 (스킬/에이전트/도구) */
  name: string;
  /** 비활성화 시간 */
  disabledAt: string;
  /** 비활성화 사유 */
  reason?: string;
  /** 비활성화 주체 */
  disabledBy: 'user' | 'system';
}

/** 비활성화 레지스트리 */
export interface DisabledRegistry {
  /** 비활성화된 스킬 목록 */
  skills: DisabledRegistryEntry[];
  /** 비활성화된 에이전트 목록 */
  agents: DisabledRegistryEntry[];
  /** 비활성화된 MCP 도구 목록 */
  tools: DisabledRegistryEntry[];
  /** 마지막 업데이트 */
  updatedAt: string;
}

/** 관리 작업 결과 */
export interface ManageResult {
  mode: ManageMode;
  success: boolean;
  /** 결과 메시지 */
  message: string;
  /** 변경된 항목 목록 */
  affected?: string[];
}
