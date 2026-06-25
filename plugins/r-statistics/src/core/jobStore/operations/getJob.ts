import { jobs, type RJob } from "../jobStore.js";

/** Look up a tracked job by id. */
export function getJob(jobId: string): RJob | undefined {
  return jobs.get(jobId);
}
