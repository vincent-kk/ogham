import { ERROR_MESSAGES } from "../../../constants/messages.js";
import { getJob } from "../../../core/index.js";
import type { RExecutionResult, RunROutput } from "../../../types/rExecution.js";

export interface GetRJobInput {
  jobId: string;
  includeStdout?: boolean;
}

function stripStreams(result: RExecutionResult): RExecutionResult {
  return {
    ...result,
    stdout: { text: "", truncated: false, encodingUsed: result.stdout.encodingUsed },
    stderr: { text: "", truncated: false, encodingUsed: result.stderr.encodingUsed },
  };
}

/**
 * get_r_job: poll an async R job's status and (when finished) its result. Set
 * includeStdout=false to omit the captured stdout/stderr text.
 */
export async function handleGetRJob(input: GetRJobInput): Promise<RunROutput> {
  const job = getJob(input.jobId);
  if (!job) throw new Error(ERROR_MESSAGES.JOB_NOT_FOUND);

  let result = job.result;
  if (result && input.includeStdout === false) result = stripStreams(result);

  return { jobId: job.jobId, status: job.status, result };
}
