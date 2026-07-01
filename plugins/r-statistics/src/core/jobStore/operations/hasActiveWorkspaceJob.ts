import { JobStatus } from "../../../types/enums.js";
import { jobs } from "../jobStore.js";

const ACTIVE: ReadonlySet<JobStatus> = new Set([
  JobStatus.Queued,
  JobStatus.Running,
]);

/**
 * True when a queued/running job currently owns this workspace — resetting it
 * (stateless rm) would race the in-flight job. Empty id → false.
 */
export function hasActiveWorkspaceJob(workspaceId: string): boolean {
  if (!workspaceId) return false;
  for (const job of jobs.values())
    if (job.workspaceId === workspaceId && ACTIVE.has(job.status)) return true;

  return false;
}
