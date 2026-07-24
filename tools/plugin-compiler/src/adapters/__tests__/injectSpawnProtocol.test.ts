import { describe, expect, it } from "vitest";

import {
  containsPersonaSpawn,
  injectSpawnProtocol,
} from "../utils/injectSpawnProtocol.js";

const FRONTMATTER =
  '---\nname: cross-review\n---\n\n# Body\nsubagent_type: "filid:a"\n';

describe("containsPersonaSpawn", () => {
  // --- basic ---

  it("matches a quoted spawn for the plugin", () => {
    expect(
      containsPersonaSpawn(
        'x `subagent_type: "filid:code-surgeon"` y',
        "filid",
      ),
    ).toBe(true);
  });

  it("matches a single-quoted spawn too", () => {
    expect(
      containsPersonaSpawn("subagent_type: 'filid:analyst'", "filid"),
    ).toBe(true);
  });

  it("ignores an unquoted prose mention (not an actual spawn instruction)", () => {
    expect(
      containsPersonaSpawn("Agent(subagent_type: filid:<id>)", "filid"),
    ).toBe(false);
  });

  it("does not match another plugin's spawn or plain text", () => {
    expect(containsPersonaSpawn('subagent_type: "entrez:x"', "filid")).toBe(
      false,
    );
    expect(containsPersonaSpawn("no spawn here", "filid")).toBe(false);
  });
});

describe("injectSpawnProtocol", () => {
  // --- basic ---

  it("inserts the protocol after frontmatter, keeping the body", () => {
    const out = injectSpawnProtocol(
      FRONTMATTER,
      "cross-review/SKILL.md",
      "filid",
    );
    expect(out.startsWith("---\nname: cross-review\n---\n")).toBe(true);
    expect(out).toContain("<!-- codex-persona-spawn");
    expect(out).toContain("# Body");
    expect(out.indexOf("codex-persona-spawn")).toBeLessThan(
      out.indexOf("# Body"),
    );
  });

  it("prepends the protocol for a sub-doc with no frontmatter", () => {
    const out = injectSpawnProtocol(
      '# Reference\nsubagent_type: "filid:a"\n',
      "scan/reference.md",
      "filid",
    );
    expect(out.startsWith("<!-- codex-persona-spawn")).toBe(true);
    expect(out).toContain("# Reference");
  });

  // --- complex ---

  it("computes the persona path from the file's depth under skills/", () => {
    const depth1 = injectSpawnProtocol(
      FRONTMATTER,
      "cross-review/SKILL.md",
      "filid",
    );
    expect(depth1).toContain("`../_shared/personas/<id>.md`");

    const depth2 = injectSpawnProtocol(
      FRONTMATTER,
      "a/references/tools.md",
      "filid",
    );
    expect(depth2).toContain("`../../_shared/personas/<id>.md`");

    const depth0 = injectSpawnProtocol(FRONTMATTER, "top.md", "filid");
    expect(depth0).toContain("`_shared/personas/<id>.md`");
    expect(depth0).not.toContain("`../_shared/personas");
  });

  it("names the plugin in the injected rule", () => {
    expect(
      injectSpawnProtocol(FRONTMATTER, "cross-review/SKILL.md", "filid"),
    ).toContain('subagent_type: "filid:<id>"');
  });

  it("is deterministic for the same inputs", () => {
    const a = injectSpawnProtocol(
      FRONTMATTER,
      "cross-review/SKILL.md",
      "filid",
    );
    const b = injectSpawnProtocol(
      FRONTMATTER,
      "cross-review/SKILL.md",
      "filid",
    );
    expect(a).toBe(b);
  });
});
