/**
 * @file types.ts
 * @description kg_build 입력/출력 및 내부 빌드 산출물 타입.
 */
import type { ScannedFile } from '../../../../core/vaultScanner/index.js';
import type { KnowledgeGraph } from '../../../../types/graph.js';
import type { MaencofCrudResult } from '../../../../types/mcp.js';

/** kg_build 입력 */
export interface KgBuildInput {
  /** 전체 재빌드 여부 (기본: false → 증분) */
  force?: boolean;
}

/** 개별 파일 파싱 실패 항목 */
export interface KgBuildParseFailure {
  /** vault 루트 기준 상대 경로 */
  path: string;
  /** 원인 메시지 (frontmatter 검증 실패 또는 파일 읽기 오류) */
  errors: string[];
}

/** kg_build 응답 */
export interface KgBuildResult extends MaencofCrudResult {
  /** 빌드된 노드 수 */
  nodeCount: number;
  /** 빌드된 엣지 수 */
  edgeCount: number;
  /** 빌드 소요 시간 (ms) */
  durationMs: number;
  /** 증분 여부 */
  incremental: boolean;
  /**
   * 개별 파일 파싱/검증 실패 목록 (있을 때만 포함, non-fatal).
   * write-path 검증 비대칭으로 인해 디스크에 흘러든 손상 frontmatter를 surface한다.
   */
  parseFailures?: KgBuildParseFailure[];
}

/** 빌드 결과: 그래프 + 스캔된 파일 목록 (스냅샷 저장에 재사용) + 파싱 실패 목록 */
export interface BuildOutput {
  graph: KnowledgeGraph;
  files: ScannedFile[];
  parseFailures: KgBuildParseFailure[];
}
