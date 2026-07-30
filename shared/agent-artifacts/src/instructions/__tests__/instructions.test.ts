import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readSection, sectionMarkers } from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SectionArtifactTarget } from "../../targets/index.js";
import {
  createInstructionSectionManager,
  createResolvedInstructionSectionManager,
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
    lockTarget: join(root, ".instruction-artifacts"),
  };
}

describe("instruction section manager", () => {
  let root: string;
  let primary: string;
  let secondary: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-instructions-"));
    primary = join(root, "AGENTS.md");
    secondary = join(root, "AGENTS.override.md");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("inspects an absent exact-path section without creating its file", () => {
    const manager = createResolvedInstructionSectionManager({
      owner: "maencof",
      targetPath: primary,
      root,
    });

    expect(manager.inspect()).toMatchObject({
      target: primary,
      targetExists: false,
      sectionContent: null,
    });
    expect(existsSync(primary)).toBe(false);
  });

  it("plans and applies a missing section as copy", () => {
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });

    const plan = manager.plan({
      content: "new body",
      replaceDrift: false,
    });
    expect(plan.outcomes).toMatchObject([{ action: "copy", target: primary }]);
    expect(plan.previews).toEqual([
      {
        target: primary,
        content: "<!-- ALPHA:START -->\nnew body\n<!-- ALPHA:END -->\n",
      },
    ]);

    expect(manager.apply(plan).outcomes).toMatchObject([{ action: "copy" }]);
    expect(readFileSync(primary, "utf8")).toBe(plan.previews[0]?.content);
    expect(existsSync(`${primary}.bak`)).toBe(false);
  });

  it("updates only the owned span and preserves every outside byte", () => {
    const markers = sectionMarkers("ALPHA");
    const before = " \n# before  \n\n";
    const after = "\n\n  after \n";
    writeFileSync(
      primary,
      `${before}${markers.start}\nold\n${markers.end}${after}`,
    );
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });

    const plan = manager.plan({
      content: "replacement",
      replaceDrift: true,
    });
    expect(plan.outcomes).toMatchObject([{ action: "update" }]);
    manager.apply(plan);

    expect(readFileSync(primary, "utf8")).toBe(
      `${before}${markers.start}\nreplacement\n${markers.end}${after}`,
    );
  });

  it("removes only the owned span and preserves every outside byte", () => {
    const markers = sectionMarkers("ALPHA");
    const before = " \n# before  \n\n";
    const after = "\n\n  after \n";
    writeFileSync(
      primary,
      `${before}${markers.start}\nold\n${markers.end}${after}`,
    );
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });

    const plan = manager.plan({
      content: null,
      replaceDrift: false,
    });
    expect(plan.outcomes).toMatchObject([{ action: "remove" }]);
    manager.apply(plan);

    expect(readFileSync(primary, "utf8")).toBe(before + after);
  });

  it("leaves an equal section unchanged without writing a backup", () => {
    const markers = sectionMarkers("ALPHA");
    const original = `${markers.start}\nsame\n${markers.end}\n`;
    writeFileSync(primary, original);
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });

    const plan = manager.plan({
      content: "same",
      replaceDrift: true,
      backup: "sibling",
    });
    expect(plan.outcomes).toMatchObject([{ action: "unchanged" }]);
    manager.apply(plan);

    expect(readFileSync(primary, "utf8")).toBe(original);
    expect(existsSync(`${primary}.bak`)).toBe(false);
  });

  it("reports drift without replacing user-edited section content", () => {
    const markers = sectionMarkers("ALPHA");
    const original = `${markers.start}\nuser edit\n${markers.end}\n`;
    writeFileSync(primary, original);
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });

    const plan = manager.plan({
      content: "desired",
      replaceDrift: false,
    });
    expect(plan.outcomes).toMatchObject([{ action: "drift" }]);
    manager.apply(plan);

    expect(readFileSync(primary, "utf8")).toBe(original);
  });

  it("reports a half-written marker pair as conflict", () => {
    const markers = sectionMarkers("ALPHA");
    const original = `before\n${markers.start}\nunfinished\n`;
    writeFileSync(primary, original);
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });

    const plan = manager.plan({
      content: "desired",
      replaceDrift: true,
    });
    expect(plan.outcomes).toMatchObject([{ action: "conflict" }]);
    manager.apply(plan);

    expect(readFileSync(primary, "utf8")).toBe(original);
  });

  it("reports duplicate owned marker pairs as conflict", () => {
    const markers = sectionMarkers("ALPHA");
    const block = `${markers.start}\nbody\n${markers.end}\n`;
    const original = block + block;
    writeFileSync(primary, original);
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });

    const plan = manager.plan({
      content: "desired",
      replaceDrift: true,
    });
    expect(plan.outcomes).toMatchObject([{ action: "conflict" }]);
    manager.apply(plan);

    expect(readFileSync(primary, "utf8")).toBe(original);
  });

  it("creates a sibling backup only when apply writes an existing file", () => {
    const markers = sectionMarkers("ALPHA");
    const original = `${markers.start}\nold\n${markers.end}\n`;
    writeFileSync(primary, original);
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });

    const plan = manager.plan({
      content: "new",
      replaceDrift: true,
      backup: "sibling",
    });
    expect(existsSync(`${primary}.bak`)).toBe(false);

    const result = manager.apply(plan);
    expect(result.backupPaths).toEqual([`${primary}.bak`]);
    expect(readFileSync(`${primary}.bak`, "utf8")).toBe(original);
  });

  it("relocates a hidden Codex section to the effective candidate", () => {
    const markers = sectionMarkers("ALPHA");
    writeFileSync(primary, `default\n${markers.start}\nbody\n${markers.end}\n`);
    writeFileSync(secondary, "# effective override\n");
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, secondary, [secondary, primary], "effective"),
    });

    const plan = manager.plan({
      content: "body",
      replaceDrift: false,
    });
    expect(plan.outcomes).toMatchObject([
      { action: "relocate", target: secondary },
    ]);
    manager.apply(plan);

    expect(readSection(readFileSync(secondary, "utf8"), markers)).toBe("body");
    expect(readSection(readFileSync(primary, "utf8"), markers)).toBeNull();
  });

  it("keeps the unique existing Claude candidate instead of moving it", () => {
    const markers = sectionMarkers("ALPHA");
    writeFileSync(secondary, `${markers.start}\nold\n${markers.end}\n`);
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(
        root,
        primary,
        [primary, secondary],
        "existing-or-effective",
      ),
    });

    const plan = manager.plan({
      content: "new",
      replaceDrift: true,
    });
    expect(plan.outcomes).toMatchObject([
      { action: "update", target: secondary },
    ]);
    manager.apply(plan);

    expect(existsSync(primary)).toBe(false);
    expect(readSection(readFileSync(secondary, "utf8"), markers)).toBe("new");
  });

  it("keeps multiple owners independently addressable in one file", () => {
    const sharedTarget = target(
      root,
      primary,
      [primary],
      "existing-or-effective",
    );
    const alpha = createInstructionSectionManager({
      owner: "alpha",
      target: sharedTarget,
    });
    const beta = createInstructionSectionManager({
      owner: "beta",
      target: sharedTarget,
    });

    alpha.apply(alpha.plan({ content: "one", replaceDrift: false }));
    beta.apply(beta.plan({ content: "two", replaceDrift: false }));

    const source = readFileSync(primary, "utf8");
    expect(readSection(source, sectionMarkers("ALPHA"))).toBe("one");
    expect(readSection(source, sectionMarkers("BETA"))).toBe("two");
  });

  it("maps a stale revision to a conflict outcome without overwriting", () => {
    const markers = sectionMarkers("ALPHA");
    writeFileSync(primary, `${markers.start}\nold\n${markers.end}\n`);
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: target(root, primary, [primary], "existing-or-effective"),
    });
    const plan = manager.plan({
      content: "planned",
      replaceDrift: true,
    });
    writeFileSync(primary, "newer user bytes\n");

    const result = manager.apply(plan);

    expect(result.outcomes).toMatchObject([
      { action: "conflict", reason: "revision" },
    ]);
    expect(readFileSync(primary, "utf8")).toBe("newer user bytes\n");
  });

  it("maps lock acquisition failure to a conflict outcome", () => {
    const markers = sectionMarkers("ALPHA");
    writeFileSync(primary, `${markers.start}\nold\n${markers.end}\n`);
    const sectionTarget = target(
      root,
      primary,
      [primary],
      "existing-or-effective",
    );
    const manager = createInstructionSectionManager({
      owner: "alpha",
      target: sectionTarget,
    });
    const plan = manager.plan({
      content: "planned",
      replaceDrift: true,
    });
    mkdirSync(`${sectionTarget.lockTarget}.lock`);

    const result = manager.apply(plan);

    expect(result.outcomes).toMatchObject([
      { action: "conflict", reason: "lock" },
    ]);
    expect(readSection(readFileSync(primary, "utf8"), markers)).toBe("old");
  });

  it("uses custom markers while keeping the resolved path exact", () => {
    const markers = {
      start: "<!-- MAENCOF:START -->",
      end: "<!-- MAENCOF:END -->",
    };
    const exact = join(root, "custom-instructions.md");
    const manager = createResolvedInstructionSectionManager({
      owner: "maencof",
      targetPath: exact,
      root,
      markers,
    });

    manager.apply(
      manager.plan({
        content: "vault directives",
        replaceDrift: true,
      }),
    );

    expect(readSection(readFileSync(exact, "utf8"), markers)).toBe(
      "vault directives",
    );
    expect(existsSync(primary)).toBe(false);
  });
});
