import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  mergeSection,
  readSection,
  sectionMarkers,
} from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SectionArtifactTarget } from "../../targets/index.js";
import type {
  ManagedRuleDocument,
  RuleDocumentRequest,
} from "../../types/rules.js";
import { hashRuleContent } from "../helpers/hashRuleContent.js";
import { createRuleDocumentManager } from "../index.js";

const { atomicWriteSpy, inspectionRace } = vi.hoisted(() => ({
  atomicWriteSpy: vi.fn(),
  inspectionRace: {
    afterInspect: null as (() => void) | null,
  },
}));

vi.mock("@ogham/cross-platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ogham/cross-platform")>();
  return {
    ...actual,
    writeFileAtomicallySync: (
      ...args: Parameters<typeof actual.writeFileAtomicallySync>
    ) => {
      atomicWriteSpy(...args);
      return actual.writeFileAtomicallySync(...args);
    },
  };
});

vi.mock(
  "../status/inspectStoredSectionRuleDocuments.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../status/inspectStoredSectionRuleDocuments.js")
      >();
    return {
      ...actual,
      inspectStoredSectionRuleDocuments: (
        ...args: Parameters<typeof actual.inspectStoredSectionRuleDocuments>
      ) => {
        const result = actual.inspectStoredSectionRuleDocuments(...args);
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
  content: "\n# expected\n",
  legacyFilenames: ["authoring.md"],
};

describe("section rule documents", () => {
  let root: string;
  let effectivePath: string;
  let fallbackPath: string;
  let target: SectionArtifactTarget;

  beforeEach(() => {
    atomicWriteSpy.mockClear();
    inspectionRace.afterInspect = null;
    root = mkdtempSync(join(tmpdir(), "agent-section-rules-"));
    effectivePath = join(root, "AGENTS.override.md");
    fallbackPath = join(root, "AGENTS.md");
    target = {
      kind: "sections",
      root,
      effectivePath,
      candidatePaths: [effectivePath, fallbackPath],
      placement: "effective",
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
      initial: "# user",
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
      final: "# expected",
    },
    {
      name: "matching and desired",
      initial: "# expected",
      desired: true,
      replaceDrift: false,
      action: "unchanged",
      final: "# expected",
    },
    {
      name: "drift without replacement",
      initial: "# user",
      desired: true,
      replaceDrift: false,
      action: "drift",
      final: "# user",
    },
    {
      name: "drift with replacement",
      initial: "# user",
      desired: true,
      replaceDrift: true,
      action: "update",
      final: "# expected",
    },
  ])(
    "uses the common facts for $name",
    ({ initial, desired, replaceDrift, action, final }) => {
      const markers = sectionMarkers("SEIRI", DOCUMENT.filename);
      if (initial !== null)
        writeFileSync(effectivePath, mergeSection("", markers, initial));

      const manager = createRuleDocumentManager({ owner: "seiri", target });
      const request: RuleDocumentRequest = {
        documents: [DOCUMENT],
        desired: new Set(desired ? [DOCUMENT.id] : []),
        replaceDrift: new Set(replaceDrift ? [DOCUMENT.id] : []),
      };

      const plan = manager.plan(request);
      expect(plan.outcomes).toMatchObject([{ id: DOCUMENT.id, action }]);
      manager.apply(plan);

      const source = existsSync(effectivePath)
        ? readFileSync(effectivePath, "utf8")
        : "";
      expect(readSection(source, markers)).toBe(final);
    },
  );

  it("treats a raw file and a trimmed section body as equivalent", () => {
    const markers = sectionMarkers("SEIRI", DOCUMENT.filename);
    writeFileSync(
      effectivePath,
      mergeSection("", markers, DOCUMENT.content as string),
    );
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    expect(manager.inspect([DOCUMENT])).toMatchObject([
      {
        target: effectivePath,
        displayTarget: "AGENTS.override.md",
        deployed: true,
        inSync: true,
        source: "current",
      },
    ]);
    expect(
      manager.plan({
        documents: [DOCUMENT],
        desired: new Set([DOCUMENT.id]),
        replaceDrift: new Set(),
      }).outcomes,
    ).toMatchObject([{ action: "unchanged" }]);
  });

  it("keeps hidden stored sync and active effective absence as separate facts", () => {
    const markers = sectionMarkers("SEIRI", DOCUMENT.filename);
    writeFileSync(
      fallbackPath,
      mergeSection("", markers, DOCUMENT.content as string),
    );
    writeFileSync(effectivePath, "# active override\n");
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    expect(manager.inspect([DOCUMENT])).toMatchObject([
      {
        target: fallbackPath,
        displayTarget: "AGENTS.md",
        source: "current",
        deployed: true,
        deployedHash: hashRuleContent("# expected"),
        inSync: true,
        active: false,
        activeTarget: effectivePath,
        activeDisplayTarget: "AGENTS.override.md",
        activeDeployedHash: null,
        activeInSync: false,
        activeSource: null,
      },
    ]);
    expect(
      manager.plan({
        documents: [DOCUMENT],
        desired: new Set([DOCUMENT.id]),
        replaceDrift: new Set(),
      }).outcomes,
    ).toMatchObject([{ action: "relocate" }]);

    writeFileSync(fallbackPath, mergeSection("", markers, "# hidden edit"));
    expect(manager.inspect([DOCUMENT])).toMatchObject([
      {
        deployed: true,
        inSync: false,
        active: false,
        activeInSync: false,
      },
    ]);
    expect(
      manager.plan({
        documents: [DOCUMENT],
        desired: new Set([DOCUMENT.id]),
        replaceDrift: new Set(),
      }).outcomes,
    ).toMatchObject([{ action: "drift" }]);
  });

  it("reports an effective legacy section instead of a hidden current one", () => {
    const current = sectionMarkers("SEIRI", DOCUMENT.filename);
    const legacy = sectionMarkers("SEIRI", "authoring.md");
    writeFileSync(
      fallbackPath,
      mergeSection("", current, DOCUMENT.content as string),
    );
    writeFileSync(
      effectivePath,
      mergeSection("# active override\n", legacy, "# legacy body"),
    );
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    expect(manager.inspect([DOCUMENT])).toMatchObject([
      {
        target: fallbackPath,
        displayTarget: "AGENTS.md",
        source: "current",
        deployed: true,
        deployedHash: hashRuleContent("# expected"),
        inSync: true,
        active: true,
        activeTarget: effectivePath,
        activeDisplayTarget: "AGENTS.override.md",
        activeSource: "legacy",
        activeDeployedHash: hashRuleContent("# legacy body"),
        activeInSync: false,
      },
    ]);
    const plan = manager.plan({
      documents: [DOCUMENT],
      desired: new Set([DOCUMENT.id]),
      replaceDrift: new Set(),
    });
    expect(plan.outcomes).toMatchObject([{ action: "relocate" }]);
    manager.apply(plan);

    const effective = readFileSync(effectivePath, "utf8");
    expect(readSection(effective, legacy)).toBeNull();
    expect(readSection(effective, current)).toBe("# expected");
    expect(effective.split(current.start).length - 1).toBe(1);
    expect(readSection(readFileSync(fallbackPath, "utf8"), current)).toBeNull();
  });

  it("combines multiple owned changes into one write and preserves other content", () => {
    const foreign = sectionMarkers("FILID", "filid_foreign.md");
    writeFileSync(
      effectivePath,
      mergeSection("# user  text\n", foreign, "# foreign"),
    );
    const second = {
      id: "review",
      filename: "seiri_review.md",
      content: "# review\n",
    };
    const manager = createRuleDocumentManager({ owner: "seiri", target });
    const plan = manager.plan({
      documents: [DOCUMENT, second],
      desired: new Set([DOCUMENT.id, second.id]),
      replaceDrift: new Set(),
    });

    manager.apply(plan);

    expect(atomicWriteSpy).toHaveBeenCalledTimes(1);
    const source = readFileSync(effectivePath, "utf8");
    expect(source).toContain("# user  text");
    expect(readSection(source, foreign)).toBe("# foreign");
    expect(
      readSection(source, sectionMarkers("SEIRI", DOCUMENT.filename)),
    ).toBe("# expected");
    expect(readSection(source, sectionMarkers("SEIRI", second.filename))).toBe(
      "# review",
    );
  });

  it("relocates a lone matching legacy section", () => {
    const legacy = sectionMarkers("SEIRI", "authoring.md");
    writeFileSync(
      fallbackPath,
      mergeSection("# fallback\n", legacy, DOCUMENT.content as string),
    );
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    expect(manager.inspect([DOCUMENT])).toMatchObject([
      {
        target: fallbackPath,
        source: "legacy",
        deployed: true,
        inSync: true,
        active: false,
        activeTarget: effectivePath,
        activeSource: null,
        activeInSync: false,
      },
    ]);
    const plan = manager.plan({
      documents: [DOCUMENT],
      desired: new Set([DOCUMENT.id]),
      replaceDrift: new Set(),
    });
    expect(plan.outcomes).toMatchObject([{ action: "relocate" }]);
    manager.apply(plan);

    expect(
      readSection(
        readFileSync(effectivePath, "utf8"),
        sectionMarkers("SEIRI", DOCUMENT.filename),
      ),
    ).toBe("# expected");
    expect(readSection(readFileSync(fallbackPath, "utf8"), legacy)).toBeNull();
  });

  it("prefers a current section when current and legacy both exist", () => {
    const current = sectionMarkers("SEIRI", DOCUMENT.filename);
    const legacy = sectionMarkers("SEIRI", "authoring.md");
    writeFileSync(
      effectivePath,
      mergeSection(mergeSection("", legacy, "# stale"), current, "# expected"),
    );
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    expect(manager.inspect([DOCUMENT])).toMatchObject([
      { target: effectivePath, source: "current", inSync: true },
    ]);
    expect(
      manager.plan({
        documents: [DOCUMENT],
        desired: new Set([DOCUMENT.id]),
        replaceDrift: new Set(),
      }).outcomes,
    ).toMatchObject([{ action: "unchanged" }]);
  });

  it("retires only orphan sections in the explicit owner namespace", () => {
    const ownedOrphan = sectionMarkers("SEIRI", "seiri_retired.md");
    const foreign = sectionMarkers("FILID", "filid_foreign.md");
    writeFileSync(
      effectivePath,
      mergeSection(
        mergeSection("# user\n", foreign, "# foreign"),
        ownedOrphan,
        "# retired",
      ),
    );
    const manager = createRuleDocumentManager({ owner: "seiri", target });

    const plan = manager.plan({
      documents: [DOCUMENT],
      desired: new Set(),
      replaceDrift: new Set(),
    });
    expect(plan.outcomes).toContainEqual({
      id: "seiri_retired.md",
      action: "remove",
      target: effectivePath,
    });
    manager.apply(plan);

    const source = readFileSync(effectivePath, "utf8");
    expect(source).toContain("# user");
    expect(readSection(source, foreign)).toBe("# foreign");
    expect(readSection(source, ownedOrphan)).toBeNull();
  });

  it("soft-skips a missing template without writing", () => {
    const markers = sectionMarkers("SEIRI", DOCUMENT.filename);
    writeFileSync(effectivePath, mergeSection("", markers, "# local"));
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

    expect(atomicWriteSpy).not.toHaveBeenCalled();
    expect(readSection(readFileSync(effectivePath, "utf8"), markers)).toBe(
      "# local",
    );
  });

  it("turns a snapshot race into conflict without overwriting newer bytes", () => {
    const markers = sectionMarkers("SEIRI", DOCUMENT.filename);
    writeFileSync(effectivePath, mergeSection("", markers, "# before"));
    inspectionRace.afterInspect = () => {
      writeFileSync(
        effectivePath,
        mergeSection("", markers, "# concurrent edit"),
      );
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
    expect(readSection(readFileSync(effectivePath, "utf8"), markers)).toBe(
      "# concurrent edit",
    );
    expect(atomicWriteSpy).not.toHaveBeenCalled();
  });
});
