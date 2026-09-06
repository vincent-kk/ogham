import { escapeMarkdownCell } from '../../scope/utils/escapeMarkdownCell.js';

/** Markdown syntax that cannot be promoted from actor advice into rendered actions. */
const BLOCKER_MARKDOWN_SYNTAX = /[\\`*_\[\]{}()!#~]/g;

/**
 * Render actor advice as plain, single-line text without HTML or automatic links.
 * @param value Untrusted factual text or resolution metadata.
 * @returns Escaped text suitable for paragraphs, lists, and index table cells.
 */
export function escapeReviewBlockerText(value: string): string {
  return escapeMarkdownCell(
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(BLOCKER_MARKDOWN_SYNTAX, '\\$&')
      .replace(/:/g, '&#58;')
      .replace(/@/g, '&#64;')
      .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' '),
  );
}
