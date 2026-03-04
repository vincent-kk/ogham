/**
 * @file setup.ts
 * @description 셋업/온보딩 타입 — SetupProgress, SetupStep, DataSourceConfig, DataSourceType
 */

/** 셋업 단계 */
export type SetupStep =
  | 'welcome'
  | 'vault-path'
  | 'core-identity-interview'
  | 'companion-identity'
  | 'scaffold-tree'
  | 'autonomy-init'
  | 'index-build'
  | 'guide'
  | 'migrate';

/** version.json 스키마 */
export interface VaultVersionInfo {
  /** 플러그인 버전 */
  version: string;
  /** 최초 설치 시각 */
  installedAt: string;
  /** 마지막 마이그레이션 시각 */
  lastMigratedAt?: string;
  /** 마이그레이션 이력 */
  migrationHistory: string[];
  /** 아키텍처 버전 (e.g. '1.0.0', '2.0.0') */
  architecture_version?: string;
}

/** 마이그레이션 개별 작업 */
export type MigrationOp =
  | { type: 'create_dir'; path: string }
  | { type: 'move_file'; from: string; to: string }
  | {
      type: 'update_frontmatter';
      path: string;
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }
  | {
      type: 'update_version';
      path: string;
      oldVersion: string;
      newVersion: string;
    };

/** WAL 항목 (작업 + 실행 상태) */
export interface MigrationWALEntry {
  op: MigrationOp;
  status: 'pending' | 'done' | 'rolled_back';
  executedAt?: string;
}

/** Write-Ahead Log */
export interface MigrationWAL {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'rolled_back';
  operations: MigrationWALEntry[];
}

/** 마이그레이션 계획 (side-effect 없는 프리뷰) */
export interface MigrationPlan {
  currentVersion: string;
  targetVersion: string;
  operations: MigrationOp[];
  summary: {
    dirsToCreate: number;
    filesToMove: number;
    frontmatterUpdates: number;
  };
}

/** 마이그레이션 실행 결과 */
export interface MigrationResult {
  success: boolean;
  walId: string;
  operationsExecuted: number;
  operationsFailed: number;
  error?: string;
}

/** 데이터 소스 타입 */
export type DataSourceType =
  | 'new-vault'
  | 'existing-markdown'
  | 'obsidian-vault'
  | 'notion-export';

/** 데이터 소스 설정 */
export interface DataSourceConfig {
  type: DataSourceType;
  /** 소스 디렉토리 절대 경로 */
  sourcePath: string;
  /** maencof vault 절대 경로 */
  vaultPath: string;
  /** 가져올 파일 패턴 (glob) */
  includePatterns?: string[];
  /** 제외 패턴 (glob) */
  excludePatterns?: string[];
}

/** 셋업 진행 상태 */
export interface SetupProgress {
  /** 현재 단계 */
  currentStep: SetupStep;
  /** 완료된 단계 목록 */
  completedSteps: SetupStep[];
  /** vault 절대 경로 */
  vaultPath?: string;
  /** Core Identity 인터뷰 응답 */
  interviewAnswers: Record<string, string>;
  /** 데이터 소스 설정 */
  dataSource?: DataSourceConfig;
  /** 셋업 시작 시간 */
  startedAt: string;
  /** 셋업 완료 여부 */
  completed: boolean;
  /** 셋업 완료 시간 */
  completedAt?: string;
}

/** 셋업 인터뷰 질문 */
export interface InterviewQuestion {
  id: string;
  question: string;
  /** 필수 여부 */
  required: boolean;
  /** 답변 힌트 */
  hint?: string;
}
