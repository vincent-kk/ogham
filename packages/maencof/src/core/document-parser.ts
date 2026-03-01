/**
 * @file document-parser.ts
 * @description 마크다운 문서 파서 — Frontmatter 추출, 링크 파싱, KnowledgeNode 구성
 *
 * 설계 원칙:
 * - 경량 YAML 파서 (regex 기반, gray-matter 의존 없음)
 * - Zod 스키마로 Frontmatter 검증
 * - 순수 함수 지향: 파일시스템 I/O 없음 (문자열 입력 → 구조체 출력)
 */
import { readFile } from 'node:fs/promises';

import type { Layer } from '../types/common.js';
import { toNodeId } from '../types/common.js';
import { FrontmatterSchema } from '../types/frontmatter.js';
import type {
  Frontmatter,
  FrontmatterParseResult,
} from '../types/frontmatter.js';
import type { KnowledgeNode } from '../types/graph.js';
export { parseScalarValue, parseYamlFrontmatter } from './yaml-parser.js';
import { parseYamlFrontmatter } from './yaml-parser.js';

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

/** Frontmatter 구분자 정규식 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** 마크다운 링크 정규식 ([text](href)) */
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;

/** 절대 경로 판별 (http://, https://, /, #로 시작) */
const ABSOLUTE_HREF_REGEX = /^(?:https?:\/\/|\/|#)/;

/**
 * 마크다운 문자열에서 Frontmatter를 추출하고 Zod로 검증한다.
 *
 * @param content - 마크다운 전체 내용
 * @returns Frontmatter 파싱 결과 + 본문
 */
export function extractFrontmatter(content: string): {
  frontmatter: FrontmatterParseResult;
  body: string;
} {
  const match = FRONTMATTER_REGEX.exec(content);

  if (!match) {
    return {
      frontmatter: {
        success: false,
        errors: ['Frontmatter 블록을 찾을 수 없음 (--- 구분자 필요)'],
        raw: '',
      },
      body: content,
    };
  }

  const raw = match[1];
  const body = content.slice(match[0].length);

  const parsed = parseYamlFrontmatter(raw);
  const validation = FrontmatterSchema.safeParse(parsed);

  if (!validation.success) {
    const errors = validation.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    return {
      frontmatter: { success: false, errors, raw },
      body,
    };
  }

  return {
    frontmatter: { success: true, data: validation.data, raw },
    body,
  };
}

/**
 * 마크다운 본문에서 아웃바운드 링크를 추출한다.
 *
 * @param body - 마크다운 본문
 * @returns 링크 목록
 */
export function extractLinks(body: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  let match: RegExpExecArray | null;

  // 코드 블록 제거 후 링크 추출 (코드 블록 내 링크 무시)
  const bodyWithoutCode = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '');

  MARKDOWN_LINK_REGEX.lastIndex = 0;
  while ((match = MARKDOWN_LINK_REGEX.exec(bodyWithoutCode)) !== null) {
    const text = match[1];
    const href = match[2].trim();

    // 빈 href 건너뛰기
    if (!href) continue;

    links.push({
      text,
      href,
      isAbsolute: ABSOLUTE_HREF_REGEX.test(href),
    });
  }

  return links;
}

/**
 * 마크다운 문자열을 파싱하여 ParsedDocument를 반환한다.
 *
 * @param relativePath - vault 루트 기준 상대 경로
 * @param content - 마크다운 내용
 * @param mtime - 파일 수정 시간
 * @returns 파싱된 문서
 */
export function parseDocument(
  relativePath: string,
  content: string,
  mtime: number,
): ParsedDocument {
  const { frontmatter, body } = extractFrontmatter(content);
  const links = extractLinks(body);

  return {
    relativePath,
    frontmatter,
    body,
    links,
    mtime,
  };
}

/**
 * ParsedDocument로부터 KnowledgeNode를 구성한다.
 * Frontmatter 검증 실패 시 NodeBuildResult.success = false 반환.
 *
 * @param doc - 파싱된 문서
 * @returns KnowledgeNode 구성 결과
 */
export function buildKnowledgeNode(doc: ParsedDocument): NodeBuildResult {
  if (!doc.frontmatter.success || !doc.frontmatter.data) {
    return {
      success: false,
      error: `Frontmatter 검증 실패: ${doc.frontmatter.errors?.join(', ')}`,
    };
  }

  const fm: Frontmatter = doc.frontmatter.data;

  // 제목 추출: Frontmatter title → 첫 번째 # 헤딩 → 파일명
  const title = fm.title ?? extractHeadingTitle(doc.body) ?? doc.relativePath;

  const node: KnowledgeNode = {
    id: toNodeId(doc.relativePath),
    path: doc.relativePath,
    title,
    layer: fm.layer as Layer,
    tags: fm.tags,
    created: fm.created,
    updated: fm.updated,
    mtime: doc.mtime,
    accessed_count: fm.accessed_count ?? 0,
  };

  if (fm.confidence !== undefined) {
    // confidence는 KnowledgeNode에 저장하지 않음 (Frontmatter 전용)
    // 향후 WeightCalculator에서 활용
  }

  return { success: true, node };
}

/**
 * 마크다운 본문에서 첫 번째 H1 헤딩을 추출한다.
 */
function extractHeadingTitle(body: string): string | undefined {
  const match = /^#\s+(.+)$/m.exec(body);
  return match?.[1]?.trim();
}

/**
 * 파일을 읽어 ParsedDocument를 반환한다.
 * (파일 I/O를 포함하는 편의 함수 — 테스트에서는 parseDocument를 직접 사용 권장)
 *
 * @param absolutePath - 파일 절대 경로
 * @param relativePath - vault 루트 기준 상대 경로
 * @param mtime - 파일 수정 시간
 * @returns 파싱된 문서
 */
export async function parseDocumentFromFile(
  absolutePath: string,
  relativePath: string,
  mtime: number,
): Promise<ParsedDocument> {
  const content = await readFile(absolutePath, 'utf-8');
  return parseDocument(relativePath, content, mtime);
}
