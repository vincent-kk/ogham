import { MAX_TRACKED_JOBS } from "../../../constants/defaults.js";
import { JobStatus } from "../../../types/enums.js";
import { jobs } from "../jobStore.js";

const TERMINAL: ReadonlySet<JobStatus> = new Set([
  JobStatus.Succeeded,
  JobStatus.Failed,
  JobStatus.Timeout,
  JobStatus.Cancelled,
]);

/**
 * Bound the long-lived MCP process's memory: when the registry exceeds the cap,
 * evict the oldest terminal jobs (Map iterates in insertion order). In-flight
 * (queued/running) jobs are never evicted.
 */
export function pruneJobs(max: number = MAX_TRACKED_JOBS): void {
  if (jobs.size <= max) return;
  for (const [jobId, job] of jobs) {
    if (jobs.size <= max) break;
    if (TERMINAL.has(job.status)) jobs.delete(jobId);
  }
}
