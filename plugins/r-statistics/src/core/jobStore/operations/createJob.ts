import { JobStatus } from "../../../types/enums.js";
import { isoNow } from "../../../utils/isoNow.js";
import { jobs, type RJob } from "../jobStore.js";
import { pruneJobs } from "./pruneJobs.js";

export interface CreateJobInput {
  jobId: string;
  workspaceId: string;
  controller: AbortController;
}

/** Register a new job in the Queued state and return it. */
export function createJob(input: CreateJobInput): RJob {
  const job: RJob = {
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    status: JobStatus.Queued,
    controller: input.controller,
    createdAt: isoNow(),
  };
  jobs.set(job.jobId, job);
  pruneJobs();
  return job;
}
