/**
 * Cross-layer handoff token constants — SSoT for action / type / stage enums
 * passed between Skills, MCP tools, and Agents.
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
