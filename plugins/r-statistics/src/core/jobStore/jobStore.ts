import type { JobStatus } from "../../types/enums.js";
import type { RExecutionResult } from "../../types/rExecution.js";

/** An in-flight or finished async R job tracked by the long-lived MCP process. */
export interface RJob {
  jobId: string;
  workspaceId: string;
  status: JobStatus;
  controller: AbortController;
  createdAt: string;
  result?: RExecutionResult;
}

/**
 * Process-lifetime job registry. Jobs are ephemeral runtime state (not session
 * state), so they live in memory for the duration of the MCP server process.
 */
export const jobs = new Map<string, RJob>();
