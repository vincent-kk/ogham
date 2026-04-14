import { FIX_REQUEST_TYPES, type FixRequestType } from '../constants/handoff-tokens.js';

/**
 * Normalize a fix-request type token from user-authored markdown.
 * Strips a leading `filid:` prefix (permanent tolerant parse — `fix-requests.md`
 * is hand-authored by the review phase and may carry a `filid:` prefix) then
 * matches against the FixRequestType enum. Returns null for unknown input.
 */
export function normalizeFixRequestType(input: string): FixRequestType | null {
  const trimmed = input.trim();
  const stripped = trimmed.startsWith('filid:') ? trimmed.slice(6) : trimmed;
  return (FIX_REQUEST_TYPES as readonly string[]).includes(stripped)
    ? (stripped as FixRequestType)
    : null;
}
