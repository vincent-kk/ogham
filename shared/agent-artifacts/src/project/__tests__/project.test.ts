import { describe, expect, it } from "vitest";

import { createProjectArtifactManager } from "../index.js";

describe("createProjectArtifactManager", () => {
  it("binds all artifact engines to an absolute project scope", () => {
    const manager = createProjectArtifactManager({
      host: "codex",
      projectRoot: "/tmp/example-project",
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

  it("rejects a runtime relative project root", () => {
    const projectRoot: string = "relative/project";

    expect(() =>
      createProjectArtifactManager({
        host: "claude",
        projectRoot,
        owner: "filid",
      }),
    ).toThrow(/absolute path/i);
  });

  it.each(["", "Uppercase", "has/slash", "-leading"])(
    "rejects invalid owner %j",
    (owner) => {
      expect(() =>
        createProjectArtifactManager({
          host: "claude",
          projectRoot: "/tmp/example-project",
          owner,
        }),
      ).toThrow(/owner/i);
    },
  );

  if (false) {
    // @ts-expect-error Project scope requires a project root.
    createProjectArtifactManager({ host: "codex", owner: "seiri" });
    createProjectArtifactManager({
      host: "codex",
      // @ts-expect-error A relative string literal is never a project root.
      projectRoot: "relative/project",
      owner: "seiri",
    });
  }
});
