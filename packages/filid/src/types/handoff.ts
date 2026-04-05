/**
 * Cross-layer handoff token types — SSoT for action / type / stage enums
 * passed between Skills, MCP tools, and Agents. See
 * `skills/pipeline/stages.md` for the token policy.
 */

export const FIX_REQUEST_TYPES = [
  'code-fix',
  'promote',
  'restructure',
] as const;
export type FixRequestType = (typeof FIX_REQUEST_TYPES)[number];

export const DEBT_ACTIONS = [
  'create',
  'list',
  'resolve',
  'calculate-bias',
] as const;
export type DebtAction = (typeof DEBT_ACTIONS)[number];

export const PIPELINE_STAGES = [
  'pr-create',
  'review',
  'resolve',
  'revalidate',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

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
