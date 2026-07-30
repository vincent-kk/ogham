import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readSection, sectionMarkers } from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SectionArtifactTarget } from "../../../targets/index.js";
import {
  applyHookInstructionSection,
  inspectHookInstructionSection,
} from "../index.js";

function target(
  root: string,
  effectivePath: string,
  candidatePaths: readonly string[],
  placement: SectionArtifactTarget["placement"],
): SectionArtifactTarget {
  return {
    kind: "sections",
    root,
    effectivePath,
    candidatePaths,
    placement,
    lockTarget: join(root, ".unused-hook-lock"),
  };
}

describe("hook instruction section API", () => {
  let root: string;
  let primary: string;
  let secondary: string;
  const markers = sectionMarkers("MAENCOF");

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "hook-instructions-"));
    primary = join(root, "AGENTS.md");
    secondary = join(root, "AGENTS.override.md");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates an absent section without a backup", () => {
    const options = {
      target: target(root, primary, [primary], "effective"),
      markers,
    };

    expect(inspectHookInstructionSection(options)).toMatchObject({
      status: "absent",
      target: primary,
      sourcePath: null,
      sectionContent: null,
    });
    expect(
      applyHookInstructionSection({
        ...options,
        content: "vault directives",
        backup: "sibling",
      }),
    ).toMatchObject({ status: "applied", backupPaths: [] });
    expect(readSection(readFileSync(primary, "utf8"), markers)).toBe(
      "vault directives",
    );
    expect(existsSync(`${primary}.bak`)).toBe(false);
  });

  it("updates only the marker span and backs up the original bytes", () => {
    const original = `before\n${markers.start}\nold\n${markers.end}\nafter\n`;
    writeFileSync(primary, original);

    const result = applyHookInstructionSection({
      target: target(root, primary, [primary], "effective"),
      markers,
      content: "new",
      backup: "sibling",
    });

    expect(result).toMatchObject({
      status: "applied",
      backupPaths: [`${primary}.bak`],
    });
    expect(readFileSync(`${primary}.bak`, "utf8")).toBe(original);
    expect(readFileSync(primary, "utf8")).toBe(
      `before\n${markers.start}\nnew\n${markers.end}\nafter\n`,
    );
  });

  it("does not write or back up an unchanged section", () => {
    const original = `${markers.start}\nsame\n${markers.end}\n`;
    writeFileSync(primary, original);

    const result = applyHookInstructionSection({
      target: target(root, primary, [primary], "effective"),
      markers,
      content: "same",
      backup: "sibling",
    });

    expect(result).toMatchObject({ status: "unchanged", backupPaths: [] });
    expect(readFileSync(primary, "utf8")).toBe(original);
    expect(existsSync(`${primary}.bak`)).toBe(false);
  });

  it("relocates a hidden effective-placement section and backs up both files", () => {
    const fallback = `fallback\n${markers.start}\nbody\n${markers.end}\n`;
    const override = "# effective override\n";
    writeFileSync(primary, fallback);
    writeFileSync(secondary, override);

    const result = applyHookInstructionSection({
      target: target(root, secondary, [secondary, primary], "effective"),
      markers,
      content: "body",
      backup: "sibling",
    });

    expect(result).toMatchObject({
      status: "applied",
      backupPaths: [`${secondary}.bak`, `${primary}.bak`],
    });
    expect(readSection(readFileSync(secondary, "utf8"), markers)).toBe("body");
    expect(readSection(readFileSync(primary, "utf8"), markers)).toBeNull();
    expect(readFileSync(`${secondary}.bak`, "utf8")).toBe(override);
    expect(readFileSync(`${primary}.bak`, "utf8")).toBe(fallback);
  });

  it("keeps a unique existing candidate for existing-or-effective placement", () => {
    writeFileSync(secondary, `${markers.start}\nold\n${markers.end}\n`);

    const inspection = inspectHookInstructionSection({
      target: target(
        root,
        primary,
        [primary, secondary],
        "existing-or-effective",
      ),
      markers,
    });

    expect(inspection).toMatchObject({
      status: "present",
      target: secondary,
      sourcePath: secondary,
      sectionContent: "old",
    });
  });

  it("rejects malformed markers without changing bytes", () => {
    const original = `before\n${markers.start}\nunfinished\n`;
    writeFileSync(primary, original);

    const result = applyHookInstructionSection({
      target: target(root, primary, [primary], "effective"),
      markers,
      content: "new",
      backup: "sibling",
    });

    expect(result).toMatchObject({ status: "conflict", backupPaths: [] });
    expect(readFileSync(primary, "utf8")).toBe(original);
    expect(existsSync(`${primary}.bak`)).toBe(false);
  });

  it("rejects multiple owned candidates without changing either file", () => {
    const first = `${markers.start}\nfirst\n${markers.end}\n`;
    const second = `${markers.start}\nsecond\n${markers.end}\n`;
    writeFileSync(primary, first);
    writeFileSync(secondary, second);

    const result = applyHookInstructionSection({
      target: target(root, secondary, [secondary, primary], "effective"),
      markers,
      content: "new",
      backup: "sibling",
    });

    expect(result).toMatchObject({ status: "conflict", backupPaths: [] });
    expect(readFileSync(primary, "utf8")).toBe(first);
    expect(readFileSync(secondary, "utf8")).toBe(second);
  });
});
