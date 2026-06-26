import type { PaperSearchOutput } from "../../../../types/tool.js";
import { pollResults } from "../../../../core/searchJob/index.js";
import { Messages } from "../../../../constants/messages.js";
import { resolveJobPath, type JobRunOptions } from "./jobLocation.js";

/**
 * paper-search-results — read a completed job's output with cursor pagination
 * over the union records (delegated to searchJob.pollResults).
 */
export async function readJob(
  jobId: string,
  cursor: string | undefined,
  options: Pick<JobRunOptions, "dir"> = {},
): Promise<PaperSearchOutput> {
  const poll = await pollResults(jobId, {
    cursor,
    path: resolveJobPath(jobId, options.dir),
  });
  if (poll.result === undefined) {
    throw new Error(`${Messages.JOB_NOT_FOUND}: results not ready`);
  }
  const output = poll.result as PaperSearchOutput;
  return { ...output, cursor: poll.cursor };
}
