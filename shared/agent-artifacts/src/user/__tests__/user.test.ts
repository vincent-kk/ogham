import { describe, expect, it } from "vitest";

import { createUserArtifactManager } from "../index.js";

describe("createUserArtifactManager", () => {
  it("binds all artifact engines without accepting an output root", () => {
    const manager = createUserArtifactManager({
      host: "claude",
      owner: "seiri",
    });

    expect(manager.rules).toMatchObject({
      inspect: expect.any(Function),
      plan: expect.any(Function),
      apply: expect.any(Function),
    });
    expect(manager.instructions).toMatchObject({
      inspect: expect.any(Function),
      plan: expect.any(Function),
      apply: expect.any(Function),
    });
    expect(manager.mcp).toMatchObject({
      inspect: expect.any(Function),
      plan: expect.any(Function),
      apply: expect.any(Function),
    });
  });

  it("rejects an invalid owner", () => {
    expect(() =>
      createUserArtifactManager({
        host: "codex",
        owner: "../cennad",
      }),
    ).toThrow(/owner/i);
  });

  if (false)
    createUserArtifactManager({
      host: "codex",
      owner: "cennad",
      // @ts-expect-error User scope does not accept a project root.
      projectRoot: "/tmp/project",
    });
});
