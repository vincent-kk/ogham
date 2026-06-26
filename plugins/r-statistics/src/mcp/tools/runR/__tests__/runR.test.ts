import { describe, expect, it } from "vitest";

import { createJob, updateJob } from "../../../../core/index.js";
import { ERROR_MESSAGES } from "../../../../constants/messages.js";
import { JobStatus, SessionMode } from "../../../../types/enums.js";
import { handleRunR } from "../runR.js";

// Pure input-validation paths — these reject before Rscript discovery, so they
// run deterministically whether or not R is installed.
describe("handleRunR input validation", () => {
  it("rejects an empty script", async () => {
    await expect(handleRunR({ scriptCode: "   " })).rejects.toThrow(
      ERROR_MESSAGES.EMPTY_SCRIPT,
    );
  });

  it("rejects sessionMode workspace_files without a workspaceId", async () => {
    await expect(
      handleRunR({
        scriptCode: "1 + 1",
        sessionMode: SessionMode.WorkspaceFiles,
      }),
    ).rejects.toThrow(ERROR_MESSAGES.WORKSPACE_FILES_REQUIRES_ID);
  });

  it("refuses to reset a workspace with an active job (stateless)", async () => {
    const workspaceId = "ws_busy_unit";
    const jobId = "job_busy_unit";
    createJob({ jobId, workspaceId, controller: new AbortController() });
    updateJob(jobId, JobStatus.Running);
    await expect(
      handleRunR({ scriptCode: "1 + 1", workspaceId }),
    ).rejects.toThrow(ERROR_MESSAGES.WORKSPACE_BUSY);
  });
});
