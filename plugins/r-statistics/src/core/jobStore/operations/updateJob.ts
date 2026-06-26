import type { JobStatus } from "../../../types/enums.js";
import type { RExecutionResult } from "../../../types/rExecution.js";
import { jobs } from "../jobStore.js";

/** Transition a job's status and optionally attach its final result. No-op if missing. */
export function updateJob(
  jobId: string,
  status: JobStatus,
  result?: RExecutionResult,
): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = status;
  if (result) job.result = result;
}
