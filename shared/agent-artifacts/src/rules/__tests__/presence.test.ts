import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { mergeSection, sectionMarkers } from "@ogham/cross-platform";
import { afterEach, describe, expect, it } from "vitest";

import type {
  DirectoryRuleTarget,
  SectionArtifactTarget,
} from "../../targets/index.js";
import type { RuleDocumentSelector } from "../../types/rules.js";
import { inspectRuleDocumentPresence } from "../status/inspectRuleDocumentPresence.js";
import { inspectTrustedRuleDocumentPresence } from "../status/inspectTrustedRuleDocumentPresence.js";

const DOCUMENT: RuleDocumentSelector = {
  filename: "filid_fractal-boundaries.md",
  legacyFilenames: ["filid_fca-policy.md"],
};

describe("rule document presence", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  it("reports a deployed legacy directory rule without hashing content", () => {
    const root = mkdtempSync(join(tmpdir(), "rule-presence-directory-"));
    roots.push(root);
    const directoryPath = join(root, ".claude", "rules");
    mkdirSync(directoryPath, { recursive: true });
    writeFileSync(join(directoryPath, "filid_fca-policy.md"), "# policy\n");
    const target: DirectoryRuleTarget = {
      kind: "directory",
      root,
      directoryPath,
      lockTarget: join(root, ".agent-artifacts-rules"),
    };

    const expected = {
      target: join(directoryPath, "filid_fca-policy.md"),
      displayTarget: ".claude/rules/filid_fca-policy.md",
      deployed: true,
    };
    expect(
      inspectRuleDocumentPresence({ owner: "filid", target }, DOCUMENT),
    ).toEqual(expected);
    expect(
      inspectTrustedRuleDocumentPresence({ owner: "filid", target }, DOCUMENT),
    ).toEqual(expected);
  });

  it("reports a deployed Codex section from its effective file", () => {
    const root = mkdtempSync(join(tmpdir(), "rule-presence-section-"));
    roots.push(root);
    const effectivePath = join(root, "AGENTS.md");
    const markers = sectionMarkers("FILID", DOCUMENT.filename);
    writeFileSync(effectivePath, mergeSection("", markers, "# policy"));
    const target: SectionArtifactTarget = {
      kind: "sections",
      root,
      effectivePath,
      candidatePaths: [effectivePath],
      placement: "effective",
      lockTarget: join(root, ".agent-artifacts-rules"),
    };

    expect(
      inspectRuleDocumentPresence({ owner: "filid", target }, DOCUMENT),
    ).toEqual({
      target: effectivePath,
      displayTarget: "AGENTS.md",
      deployed: true,
    });
  });

  it("does not report a section hidden behind the effective Codex file", () => {
    const root = mkdtempSync(join(tmpdir(), "rule-presence-hidden-section-"));
    roots.push(root);
    const effectivePath = join(root, "AGENTS.override.md");
    const fallbackPath = join(root, "AGENTS.md");
    const markers = sectionMarkers("FILID", DOCUMENT.filename);
    writeFileSync(effectivePath, "# active override\n");
    writeFileSync(fallbackPath, mergeSection("", markers, "# hidden policy"));
    const target: SectionArtifactTarget = {
      kind: "sections",
      root,
      effectivePath,
      candidatePaths: [effectivePath, fallbackPath],
      placement: "effective",
      lockTarget: join(root, ".agent-artifacts-rules"),
    };
    const expected = {
      target: effectivePath,
      displayTarget: "AGENTS.override.md",
      deployed: false,
    };

    expect(
      inspectRuleDocumentPresence({ owner: "filid", target }, DOCUMENT),
    ).toEqual(expected);
    expect(
      inspectTrustedRuleDocumentPresence({ owner: "filid", target }, DOCUMENT),
    ).toEqual(expected);
  });
});
