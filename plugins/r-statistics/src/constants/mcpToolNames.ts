export const McpToolName = {
  RUN_R: "run_r",
  GET_R_JOB: "get_r_job",
  CANCEL_R_JOB: "cancel_r_job",
  ASSERT_ANALYSIS_PLAN: "assert_analysis_plan",
} as const;

export type McpToolName = (typeof McpToolName)[keyof typeof McpToolName];

export const MCP_TOOL_NAMES = Object.values(McpToolName) as McpToolName[];
