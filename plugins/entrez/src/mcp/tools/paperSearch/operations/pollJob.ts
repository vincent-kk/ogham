import type {
  PaperSearchStatusOutput,
  SearchError,
} from "../../../../types/tool.js";
import { getJob } from "../../../../core/searchJob/index.js";
import { Messages } from "../../../../constants/messages.js";
import { resolveJobPath, type JobRunOptions } from "./jobLocation.js";

/** paper_search_status — report a job's status and progress. */
export async function pollJob(
  jobId: string,
  options: Pick<JobRunOptions, "dir"> = {},
): Promise<PaperSearchStatusOutput> {
  const job = await getJob(jobId, { path: resolveJobPath(jobId, options.dir) });
  if (!job) throw new Error(Messages.JOB_NOT_FOUND);

  const error: SearchError | undefined = job.error
    ? { code: job.error.code, message: job.error.message, retryable: false }
    : undefined;

  return {
    jobId,
    status: job.status,
    progress: job.progress,
    partial: job.partial,
    error,
  };
}
