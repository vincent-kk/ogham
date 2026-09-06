import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';

/** HTML ampersand escaped before other entities. */
const AMPERSAND_PATTERN = /&/g;

/** HTML open angle bracket. */
const LESS_THAN_PATTERN = /</g;

/** HTML close angle bracket. */
const GREATER_THAN_PATTERN = />/g;

/** Markdown syntax that cannot be promoted from actor advice into rendered actions. */
const BLOCKER_MARKDOWN_SYNTAX = /[\\`*_[\]{}()!#~]/g;

/** Colon that would otherwise form Markdown autolinks or definitions. */
const COLON_PATTERN = /:/g;

/** At-sign that would otherwise form mention-like autolinks. */
const AT_SIGN_PATTERN = /@/g;

/** ASCII control characters replaced with spaces (built without a control-char regex literal). */
const CONTROL_CHAR_PATTERN = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  'g',
);

/**
 * Render actor advice as plain, single-line text without HTML or automatic links.
 * @param value Untrusted factual text or resolution metadata.
 * @returns Escaped text suitable for paragraphs, lists, and index table cells.
 */
export function escapeReviewBlockerText(value: string): string {
  return escapeMarkdownCell(
    value
      .replace(AMPERSAND_PATTERN, '&amp;')
      .replace(LESS_THAN_PATTERN, '&lt;')
      .replace(GREATER_THAN_PATTERN, '&gt;')
      .replace(BLOCKER_MARKDOWN_SYNTAX, '\\$&')
      .replace(COLON_PATTERN, '&#58;')
      .replace(AT_SIGN_PATTERN, '&#64;')
      .replace(CONTROL_CHAR_PATTERN, ' '),
  );
}
