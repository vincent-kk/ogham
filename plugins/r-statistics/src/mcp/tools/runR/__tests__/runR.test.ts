import { describe, expect, it } from "vitest";

import { ERROR_MESSAGES } from "../../../../constants/messages.js";
import { SessionMode } from "../../../../types/enums.js";
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
});
