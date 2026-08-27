/** A Jira numeric entity id represented as an unsigned decimal string. */
export const NUMERIC_ID_PATTERN = /^\d+$/;

/** HTML-like tags removed before comparing rendered comment bodies. */
export const HTML_TAG_PATTERN = /<[^>]+>/g;

/** The HTML non-breaking-space entity normalized as ordinary whitespace. */
export const NON_BREAKING_SPACE_ENTITY_PATTERN = /&nbsp;/g;

/** Consecutive whitespace collapsed before comparing comment bodies. */
export const WHITESPACE_PATTERN = /\s+/g;

/** Jira issue keys accepted by the recipe before endpoint construction. */
export const ISSUE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*-\d+$/;

/** Property keys that look like a reply plugin's snapshot. */
export const REPLY_PROPERTY_KEY_PATTERN = /reply|thread/i;
