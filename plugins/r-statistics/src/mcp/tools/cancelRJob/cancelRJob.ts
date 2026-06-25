import { cancelJob } from "../../../core/index.js";
import type { CancelStatus } from "../../../types/enums.js";

export interface CancelRJobInput {
  jobId: string;
}

export interface CancelRJobOutput {
  jobId: string;
  status: CancelStatus;
}

/**
 * cancel_r_job: abort a running R job (SIGKILL via its AbortController). Returns
 * cancelled / already_finished / not_found. Idempotent.
 */
export async function handleCancelRJob(
  input: CancelRJobInput,
): Promise<CancelRJobOutput> {
  return { jobId: input.jobId, status: cancelJob(input.jobId) };
}
