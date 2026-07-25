import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryRuleTarget } from "../../targets/index.js";
import type {
  ManagedRuleDocument,
  RuleDocumentRequest,
} from "../../types/rules.js";
import {
  createRuleDocumentManager,
  inspectRuleDocumentStatus,
} from "../index.js";

const inspectionRace = vi.hoisted(() => ({
  afterInspect: null as (() => void) | null,
}));

vi.mock(
  "../status/inspectDirectoryRuleDocuments.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../status/inspectDirectoryRuleDocuments.js")
      >();
    return {
      ...actual,
      inspectDirectoryRuleDocuments: (
        ...args: Parameters<typeof actual.inspectDirectoryRuleDocuments>
      ) => {
        const result = actual.inspectDirectoryRuleDocuments(...args);
        const afterInspect = inspectionRace.afterInspect;
        inspectionRace.afterInspect = null;
        afterInspect?.();
        return result;
      },
    };
  },
);

const DOCUMENT: ManagedRuleDocument = {
  id: "authoring",
  filename: "seiri_authoring.md",
  content: "# expected\n",
  legacyFilenames: ["authoring.md"],
};

describe("directory rule documents", () => {
  let root: string;
  let rulesDirectory: string;
  let currentPath: string;
  let target: DirectoryRuleTarget;

  beforeEach(() => {
    inspectionRace.afterInspect = null;
    root = mkdtempSync(join(tmpdir(), "agent-directory-rules-"));
    rulesDirectory = join(root, ".claude", "rules");
    mkdirSync(rulesDirectory, { recursive: true });
    currentPath = join(rulesDirectory, DOCUMENT.filename);
    target = {
      kind: "directory",
      root,
      directoryPath: rulesDirectory,
      lockTarget: join(root, ".agent-artifacts-rules"),
    };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it.each<{
    name: string;
    initial: string | null;
    desired: boolean;
    replaceDrift: boolean;
    action: string;
    final: string | null;
  }>([
    {
      name: "absent and undesired",
      initial: null,
      desired: false,
      replaceDrift: false,
      action: "unchanged",
      final: null,
    },
    {
      name: "deployed and undesired",
      initial: "# user\n",
      desired: false,
      replaceDrift: false,
      action: "remove",
      final: null,
    },
    {
      name: "absent and desired",
      initial: null,
      desired: true,
      replaceDrift: false,
      action: "copy",
      final: "# expected\n",
    },
    {
      name: "matching and desired",
      initial: "# expected\n",
      desired: true,
      replaceDrift: false,
      action: "unchanged",
      final: "# expected\n",
    },
    {
      name: "drift without replacement",
      initial: "# user\n",
      desired: true,
      replaceDrift: false,
      action: "drift",
      final: "# user\n",
    },
    {
      name: "drift with replacement",
      initial: "# user\n",
      desired: true,
      replaceDrift: true,
      action: "update",
      final: "# expected\n",
    },
  ])(
    "uses the common facts for $name",
    ({ initial, desired, replaceDrift, action, final }) => {
      if (initial !== null) writeFileSync(currentPath, initial);
      const manager = createRuleDocumentManager({ owner: "seiri", target });
      const request: RuleDocumentRequest = {
        documents: [DOCUMENT],
        desired: new Set(desired ? [DOCUMENT.id] : []),
        replaceDrift: new Set(replaceDrift ? [DOCUMENT.id] : []),
      };

      const plan = manager.plan(request);
      expect(plan.outcomes).toMatchObject([{ id: DOCUMENT.id, action }]);
      manager.apply(plan);

      expect(existsSync(currentPath)).toBe(final !== null);
      if (final !== null) expect(readFileSync(currentPath, "utf8")).toBe(final);
    },
  );

  it("reports the physical and display target with hashes", () => {
    writeFileSync(currentPath, DOCUMENT.content as string);

    expect(
      inspectRuleDocumentStatus({ owner: "seiri", target }, [DOCUMENT]),
    ).toEqual([
      {
        id: DOCUMENT.id,
        filename: DOCUMENT.filename,
        target: currentPath,
        displayTarget: ".claude/rules/seiri_authoring.md",
        deployed: true,
        active: true,
        activeTarget: currentPath,
        activeDisplayTarget: ".claude/rules/seiri_authoring.md",
        activeDeployedHash: expect.any(String),
        activeInSync: true,
        activeSource: "current",
        deployedHash: expect.any(String),
        expectedHash: expect.any(String),
        inSync: true,
        source: "current",
      },
    ]);
  });

  it("relocates a lone matching legacy file", () => {
    const legacyPath = join(rulesDirectory, "authoring.md");
    writeFileSync(legacyPath, DOCUMENT.content as string);
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    expect(manager.inspect([DOCUMENT])).toMatchObject([
      { target: legacyPath, source: "legacy", inSync: true },
    ]);
    const plan = manager.plan({
      documents: [DOCUMENT],
      desired: new Set([DOCUMENT.id]),
      replaceDrift: new Set(),
    });
    expect(plan.outcomes).toMatchObject([{ action: "relocate" }]);
    manager.apply(plan);

    expect(readFileSync(currentPath, "utf8")).toBe(DOCUMENT.content);
    expect(existsSync(legacyPath)).toBe(false);
  });

  it("prefers a current file when current and legacy both exist", () => {
    const legacyPath = join(rulesDirectory, "authoring.md");
    writeFileSync(currentPath, DOCUMENT.content as string);
    writeFileSync(legacyPath, "# stale legacy\n");
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    expect(manager.inspect([DOCUMENT])).toMatchObject([
      { target: currentPath, source: "current", inSync: true },
    ]);
    expect(
      manager.plan({
        documents: [DOCUMENT],
        desired: new Set([DOCUMENT.id]),
        replaceDrift: new Set(),
      }).outcomes,
    ).toMatchObject([{ action: "unchanged" }]);
  });

  it("retires only orphan files in the explicit owner namespace", () => {
    const ownedOrphan = join(rulesDirectory, "seiri_retired.md");
    const otherOwner = join(rulesDirectory, "filid_foreign.md");
    const similarPrefix = join(rulesDirectory, "seiriously_foreign.md");
    writeFileSync(ownedOrphan, "retired");
    writeFileSync(otherOwner, "other");
    writeFileSync(similarPrefix, "similar");
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    const plan = manager.plan({
      documents: [DOCUMENT],
      desired: new Set(),
      replaceDrift: new Set(),
    });
    expect(plan.outcomes).toContainEqual({
      id: "seiri_retired.md",
      action: "remove",
      target: ownedOrphan,
    });
    manager.apply(plan);

    expect(existsSync(ownedOrphan)).toBe(false);
    expect(readFileSync(otherOwner, "utf8")).toBe("other");
    expect(readFileSync(similarPrefix, "utf8")).toBe("similar");
  });

  it("soft-skips a missing template without overwriting local bytes", () => {
    writeFileSync(currentPath, "# local\n");
    const manager = createRuleDocumentManager({ owner: "seiri", target });
    const document = { ...DOCUMENT, content: null };

    const plan = manager.plan({
      documents: [document],
      desired: new Set([document.id]),
      replaceDrift: new Set([document.id]),
    });
    expect(plan.outcomes).toMatchObject([
      { action: "skip", reason: expect.stringContaining("content") },
    ]);
    manager.apply(plan);

    expect(readFileSync(currentPath, "utf8")).toBe("# local\n");
  });

  it("turns a snapshot race into conflict without overwriting newer bytes", () => {
    writeFileSync(currentPath, "# before\n");
    inspectionRace.afterInspect = () => {
      writeFileSync(currentPath, "# concurrent edit\n");
    };
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    const plan = manager.plan({
      documents: [DOCUMENT],
      desired: new Set([DOCUMENT.id]),
      replaceDrift: new Set([DOCUMENT.id]),
    });

    expect(plan.outcomes).toMatchObject([
      { action: "conflict", reason: "revision-changed-during-plan" },
    ]);
    expect(manager.apply(plan).outcomes).toMatchObject([
      { action: "conflict" },
    ]);
    expect(readFileSync(currentPath, "utf8")).toBe("# concurrent edit\n");
  });

  it.runIf(process.platform !== "win32")(
    "continues after one directory item fails",
    () => {
      const outsidePath = join(root, "outside.md");
      const brokenPath = join(rulesDirectory, "seiri_broken.md");
      writeFileSync(outsidePath, "# outside\n");
      symlinkSync(outsidePath, brokenPath);
      const healthy = {
        id: "healthy",
        filename: "seiri_healthy.md",
        content: "# healthy\n",
      };
      const broken = {
        id: "broken",
        filename: "seiri_broken.md",
        content: "# broken\n",
      };
      const manager = createRuleDocumentManager({ owner: "seiri", target });

      const plan = manager.plan({
        documents: [broken, healthy],
        desired: new Set([healthy.id]),
        replaceDrift: new Set(),
      });
      const result = manager.apply(plan);

      expect(result.outcomes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: broken.id, action: "skip" }),
          expect.objectContaining({ id: healthy.id, action: "copy" }),
        ]),
      );
      expect(readFileSync(join(rulesDirectory, healthy.filename), "utf8")).toBe(
        healthy.content,
      );
      expect(existsSync(brokenPath)).toBe(true);
    },
  );
});
