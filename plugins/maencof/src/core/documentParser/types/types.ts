/**
 * @file types.ts
 * @description documentParser 공개 타입 — 마크다운 링크, 파싱된 문서, KnowledgeNode 구성 결과.
 */
import type { FrontmatterParseResult } from '../../../types/frontmatter.js';
import type { KnowledgeNode } from '../../../types/graph.js';

/** 마크다운 링크 정보 */
export interface MarkdownLink {
  /** 링크 종류 — 표준 마크다운 `[text](href)` 또는 위키링크 `[[...]]` */
  kind: 'markdown' | 'wiki';
  /** 링크 텍스트 */
  text: string;
  /** 링크 대상 (상대 경로) */
  href: string;
  /** 절대 경로 여부 */
  isAbsolute: boolean;
}

/** 문서 파싱 결과 */
export interface ParsedDocument {
  /** 파일 상대 경로 (vault 루트 기준) */
  relativePath: string;
  /** Frontmatter 파싱 결과 */
  frontmatter: FrontmatterParseResult;
  /** 본문 (Frontmatter 제외) */
  body: string;
  /** 아웃바운드 링크 목록 */
  links: MarkdownLink[];
  /** 파일 수정 시간 */
  mtime: number;
}

/** buildKnowledgeNode 옵션 */
export interface BuildKnowledgeNodeOptions {
  /**
   * true 면 레이어 밖 경로(서고 등)도 노드 구성을 허용한다 — frontmatter 검증만
   * 필요한 소비자(read/update/move/delete) 전용. 그래프 삽입 경로는 기본 게이트를 쓴다.
   */
  allowNonLayerPath?: boolean;
}

/** KnowledgeNode 구성 결과 */
export interface NodeBuildResult {
  /** 성공 여부 */
  success: boolean;
  /** 구성된 노드 (성공 시) */
  node?: KnowledgeNode;
  /** 오류 메시지 (실패 시) */
  error?: string;
}
