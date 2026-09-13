import { describe, expect, it } from "vitest";

import { resolveInitialConfigScope } from "../index.js";

describe("initial settings scope", () => {
  it.each([
    { user: null, project: null, expected: "project" },
    { user: {}, project: null, expected: "user" },
    { user: null, project: {}, expected: "project" },
    { user: { enabled: true }, project: {}, expected: "project" },
  ])(
    "selects $expected for user=$user project=$project",
    ({ user, project, expected }) => {
      expect(resolveInitialConfigScope({ user, project })).toBe(expected);
    },
  );
});
