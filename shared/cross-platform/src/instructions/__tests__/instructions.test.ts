import { describe, expect, it } from "vitest";

import {
  INSTRUCTIONS_FILES,
  mergeSection,
  readSection,
  removeSection,
  sectionMarkers,
} from "../index.js";

const RULE = sectionMarkers("FILID", "filid_fca-policy.md");
const MAENCOF = sectionMarkers("MAENCOF");

describe("sectionMarkers", () => {
  it("keeps maencof's deployed marker pair as the id-less form, so files it manages still parse", () => {
    expect(MAENCOF).toEqual({
      start: "<!-- MAENCOF:START -->",
      end: "<!-- MAENCOF:END -->",
    });
  });

  it("addresses each rule document separately, so one AGENTS.md can hold the whole directory", () => {
    expect(RULE.start).toBe("<!-- FILID:START:filid_fca-policy.md -->");
    expect(RULE.end).toBe("<!-- FILID:END:filid_fca-policy.md -->");
  });

  it("lists both instruction files, since a hook has no marker telling it which host it is on", () => {
    expect(INSTRUCTIONS_FILES).toEqual(["CLAUDE.md", "AGENTS.md"]);
  });
});

describe("mergeSection", () => {
  it("appends to a file that has no section, preserving what the user wrote", () => {
    const merged = mergeSection("# My Project\n", RULE, "rule body");
    expect(merged).toContain("# My Project");
    expect(readSection(merged, RULE)).toBe("rule body");
  });

  it("replaces in place on a second run — a rerun of setup must not stack a second copy", () => {
    const once = mergeSection("# My Project\n", RULE, "rule body");
    const twice = mergeSection(once, RULE, "rule body");
    expect(twice).toBe(once);
    expect(twice.split(RULE.start)).toHaveLength(2);
  });

  it("updates the body without touching a single character outside the markers", () => {
    const before = mergeSection("# Head\n", RULE, "v1");
    const after = mergeSection(`${before}\n## Tail\n`, RULE, "v2");
    expect(readSection(after, RULE)).toBe("v2");
    expect(after).toContain("# Head");
    expect(after).toContain("## Tail");
  });

  it("lets two plugins share one file, each owning its own span", () => {
    const both = mergeSection(
      mergeSection("", RULE, "fca policy"),
      MAENCOF,
      "vault directives",
    );
    expect(readSection(both, RULE)).toBe("fca policy");
    expect(readSection(both, MAENCOF)).toBe("vault directives");
  });
});

describe("readSection / removeSection", () => {
  it("reads nothing from a file that never carried the section", () => {
    expect(readSection("# My Project\n", RULE)).toBeNull();
    expect(removeSection("# My Project\n", RULE)).toBeNull();
  });

  it("removes only its own span, leaving the other plugin's section intact", () => {
    const both = mergeSection(
      mergeSection("# Head\n", RULE, "fca policy"),
      MAENCOF,
      "vault directives",
    );
    const removed = removeSection(both, RULE);
    expect(removed).not.toBeNull();
    expect(readSection(removed as string, RULE)).toBeNull();
    expect(readSection(removed as string, MAENCOF)).toBe("vault directives");
    expect(removed).toContain("# Head");
  });

  it("ignores a half-written section rather than splicing on a marker it cannot pair", () => {
    const orphan = `# Head\n${RULE.end}\ntail\n${RULE.start}\n`;
    expect(readSection(orphan, RULE)).toBeNull();
    expect(removeSection(orphan, RULE)).toBeNull();
  });
});
