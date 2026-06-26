import { jobs } from "../jobStore.js";

import { cancelJob } from "./cancelJob.js";

/** Abort every non-terminal job — used on process shutdown so no child outlives us. */
export function cancelAllJobs(): void {
  for (const jobId of jobs.keys()) cancelJob(jobId);
}
