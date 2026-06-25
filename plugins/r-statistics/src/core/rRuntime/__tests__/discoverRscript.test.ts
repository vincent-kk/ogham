import { afterEach, describe, expect, it } from "vitest";

import { RSCRIPT_ENV_VAR } from "../../../constants/defaults.js";
import { discoverRscript } from "../operations/discoverRscript.js";

const BOGUS = "/definitely/not/here/Rscript";

describe("discoverRscript", () => {
  afterEach(() => {
    delete process.env[RSCRIPT_ENV_VAR];
  });

  it("honors the env override when it points to an executable", () => {
    // node's own binary is a real executable, standing in for Rscript.
    process.env[RSCRIPT_ENV_VAR] = process.execPath;
    expect(discoverRscript()).toBe(process.execPath);
  });

  it("ignores a non-existent env override and never returns it", () => {
    process.env[RSCRIPT_ENV_VAR] = BOGUS;
    expect(discoverRscript()).not.toBe(BOGUS);
  });
});
