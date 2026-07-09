/**
 * @file types.ts
 * @description documentParser 공개 타입 — 마크다운 링크, 파싱된 문서, KnowledgeNode 구성 결과.
 */
import type { FrontmatterParseResult } from '../../../types/frontmatter.js';
import type { KnowledgeNode } from '../../../types/graph.js';

/** 마크다운 링크 정보 */
export interface MarkdownLink {
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

/** KnowledgeNode 구성 결과 */
export interface NodeBuildResult {
  /** 성공 여부 */
  success: boolean;
  /** 구성된 노드 (성공 시) */
  node?: KnowledgeNode;
  /** 오류 메시지 (실패 시) */
  error?: string;
}
