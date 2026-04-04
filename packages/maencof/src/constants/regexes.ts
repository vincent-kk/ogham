export const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Frontmatter 구분자 정규식 (캡처 그룹 없음 — 블록 전체 제거용) */
export const FRONTMATTER_STRIP_REGEX = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

export const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g;

export const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

export const ABSOLUTE_HREF_REGEX = /^(?:https?:\/\/|\/|#)/;

export const H1_REGEX = /^#\s+(.+)$/m;

export const YAML_UNSAFE_START = /^[#'"{}[\],&*?|<>=!%@`\-]/;

export const YAML_BOOLEAN_NULL = /^(true|false|null|~|yes|no|on|off)$/i;
