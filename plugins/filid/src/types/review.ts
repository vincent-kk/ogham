/** 변경 사항의 복잡도 등급 */
export type Complexity = 'TRIVIAL' | 'LOW' | 'MEDIUM' | 'HIGH';

/** 페르소나 식별자 */
export type PersonaId =
  | 'adjudicator'
  | 'engineering-architect'
  | 'knowledge-manager'
  | 'operations-sre'
  | 'business-driver'
  | 'product-manager'
  | 'design-hci';

/** 체크포인트 Phase */
export type CheckpointPhase = 'A' | 'B' | 'C' | 'D' | 'DONE';

/** 체크포인트 상태 */
export interface CheckpointStatus {
  /** 현재 Phase */
  phase: CheckpointPhase;
  /** 존재하는 파일 목록 */
  files: string[];
  /** Content hash from last completed review (if content-hash.json exists) */
  contentHash?: string;
  /** session.md 의 resume_attempts 카운터 (무한 루프 방지용, Phase A 재시작 시 skill 이 증가) */
  resumeAttempts?: number;
  /** resumeAttempts 가 MAX_RESUME_RETRIES 에 도달했는지 — skill 은 true 시 INCONCLUSIVE 로 종결해야 함 */
  resumeExhausted?: boolean;
}

/** 위원회 선출 결과 */
export interface CommitteeElection {
  /** 복잡도 등급 */
  complexity: Complexity;
  /** 선출된 위원 목록 */
  committee: PersonaId[];
  /** 적대적 짝짓기 쌍 */
  adversarialPairs: [PersonaId, PersonaId[]][];
}

/** 리뷰 세션 정보 (session.md frontmatter) */
export interface ReviewSession {
  /** 원본 브랜치 이름 */
  branch: string;
  /** 정규화된 브랜치 이름 */
  normalized_branch: string;
  /** merge-base commit SHA */
  base_ref: string;
  /** 복잡도 등급 */
  complexity: Complexity;
  /** 선출된 위원 목록 */
  committee: PersonaId[];
  /** 변경 파일 수 */
  changed_files_count: number;
  /** 변경된 프랙탈 경로 목록 */
  changed_fractals: string[];
  /** 인터페이스 변경 여부 */
  interface_changes: boolean;
  /** 세션 생성 시각 (ISO 8601) */
  created_at: string;
}

/** 상태 머신 상태 */
export type StateMachineState =
  | 'PROPOSAL'
  | 'DEBATE'
  | 'VETO'
  | 'SYNTHESIS'
  | 'ABSTAIN'
  | 'CONCLUSION';

/** 리뷰 최종 판정 */
export type ReviewVerdict = 'APPROVED' | 'REQUEST_CHANGES' | 'INCONCLUSIVE';

/** Content hash for a review session, stored as .filid/review/<branch>/content-hash.json */
export interface ReviewContentHash {
  /** Composite hash: SHA-256 of sorted "baseCommit\npath:blobhash\n..." */
  sessionHash: string;
  /** The merge-base commit SHA used in hash computation */
  baseCommit: string;
  /** Per-file blob hashes: Record<relative_path, git_blob_hash | "DELETED"> */
  fileHashes: Record<string, string>;
  /** ISO 8601 timestamp of computation */
  computedAt: string;
}

/** Cache check result returned by check-cache action */
export interface ReviewCacheResult {
  /** Whether a valid cache exists for this content */
  cacheHit: boolean;
  /** Directive for skill file */
  action: 'skip-to-existing-results' | 'proceed-full-review';
  /** The current content hash */
  currentHash: string;
  /** The cached hash (if any prior review exists) */
  cachedHash: string | null;
  /** Path to existing review-report.md (only when cacheHit=true) */
  existingReportPath: string | null;
  /** Path to existing fix-requests.md (only when cacheHit=true) */
  existingFixRequestsPath: string | null;
  /** Human-readable message for skill output */
  message: string;
}
