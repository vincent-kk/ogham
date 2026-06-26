import { CancelStatus, JobStatus } from "../../../types/enums.js";
import { jobs } from "../jobStore.js";

const TERMINAL: ReadonlySet<JobStatus> = new Set([
  JobStatus.Succeeded,
  JobStatus.Failed,
  JobStatus.Timeout,
  JobStatus.Cancelled,
]);

/** Abort a running job (SIGKILL via its controller) and mark it cancelled. */
export function cancelJob(jobId: string): CancelStatus {
  const job = jobs.get(jobId);
  if (!job) return CancelStatus.NotFound;
  if (TERMINAL.has(job.status)) return CancelStatus.AlreadyFinished;
  job.controller.abort();
  job.status = JobStatus.Cancelled;
  return CancelStatus.Cancelled;
}
