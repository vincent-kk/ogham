export const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Frontmatter 구분자 정규식 (캡처 그룹 없음 — 블록 전체 제거용) */
export const FRONTMATTER_STRIP_REGEX = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

export const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;

export const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

export const ABSOLUTE_HREF_REGEX = /^(?:https?:\/\/|\/|#)/;

export const H1_REGEX = /^#\s+(.+)$/m;

/**
 * 단어 경계 분리 정규식 — 제목/시드 토큰화의 단일 출처.
 * inverted-index term 토큰화(tokenizeForInvertedIndex)와 시드 토큰화(queryEngine)가
 * 동일 경계를 사용하도록 보장한다. `g` 플래그 없음 — `.split()` 전용으로 재사용 안전.
 */
export const WORD_BOUNDARY_SPLIT_REGEX = /[\s\-_/\\.,;:!?()[\]{}'"]+/;

export const YAML_UNSAFE_START = /^[#'"{}[\],&*?|<>=!%@`-]/;

export const YAML_BOOLEAN_NULL = /^(true|false|null|~|yes|no|on|off)$/i;
