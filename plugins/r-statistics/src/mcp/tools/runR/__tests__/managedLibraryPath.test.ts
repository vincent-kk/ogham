// filid:contract AC-managed-library-path
import { describe, expect, it } from "vitest";

import { MANAGED_R_LIB_DIR } from "../../../../constants/paths.js";
import { JobStatus, RErrorCode } from "../../../../types/enums.js";
import { handleRunR } from "../runR.js";

describe("run_r managed library output", () => {
  it("includes the runtime library in a command-blocked result", async () => {
    const output = await handleRunR({ scriptCode: 'system("echo blocked")' });
    expect(output.status).toBe(JobStatus.Failed);
    expect(output.result?.error?.code).toBe(RErrorCode.CommandBlocked);
    expect(output.managedLibraryPath).toBe(MANAGED_R_LIB_DIR);
  });
});
