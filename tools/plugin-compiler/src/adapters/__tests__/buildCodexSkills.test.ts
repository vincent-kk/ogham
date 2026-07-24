import { describe, expect, it } from "vitest";

import type { CodexSkillFile, PluginFacts } from "../../types/index.js";
import {
  buildCodexSkills,
  emitsCodexSkillVariant,
} from "../builders/buildCodexSkills.js";

function facts(overrides: Partial<PluginFacts> = {}): PluginFacts {
  return {
    directory: "/repo/plugins/filid",
    name: "filid",
    manifest: { name: "filid" },
    hasSkills: true,
    hasHooks: false,
    hooksFile: null,
    mcpServers: null,
    agentFiles: {},
    skillFiles: {},
    ...overrides,
  };
}

const VARIANT = facts({
  agentFiles: { "code-surgeon.md": "PERSONA-A", "adjudicator.md": "PERSONA-B" },
  skillFiles: {
    "cross-review/SKILL.md":
      '---\nname: x\n---\nspawn `subagent_type: "filid:code-surgeon"`',
    "cross-review/contracts.md": "NO SPAWN HERE",
  },
});

function find(
  files: CodexSkillFile[],
  path: string,
): CodexSkillFile | undefined {
  return files.find((f) => f.relativePath === path);
}

describe("emitsCodexSkillVariant", () => {
  // --- basic ---

  it("is false for a qualifying plugin held off the opt-in allowlist (prawf)", () => {
    // prawf has personas and subagent_type spawns but is deliberately excluded
    // (its worker prompt loads personas by an actionable ../../agents/ climb).
    expect(
      emitsCodexSkillVariant(
        facts({
          name: "prawf",
          agentFiles: { "x.md": "P" },
          skillFiles: { "peer-review/SKILL.md": 'subagent_type: "prawf:x"' },
        }),
      ),
    ).toBe(false);
  });

  it("is false without personas, or without a spawn skill", () => {
    expect(
      emitsCodexSkillVariant(
        facts({ skillFiles: { "s/SKILL.md": 'subagent_type: "filid:x"' } }),
      ),
    ).toBe(false);
    expect(
      emitsCodexSkillVariant(
        facts({
          agentFiles: { "x.md": "P" },
          skillFiles: { "s/SKILL.md": "no spawn" },
        }),
      ),
    ).toBe(false);
  });

  it("is true for an opted-in plugin with personas and a spawn skill", () => {
    expect(emitsCodexSkillVariant(VARIANT)).toBe(true);
  });
});

describe("buildCodexSkills", () => {
  // --- basic ---

  it("returns null when the plugin does not qualify", () => {
    expect(buildCodexSkills(facts())).toBeNull();
  });

  // --- complex ---

  it("copies a non-spawn skill file byte-identical under the Codex dir", () => {
    const files = buildCodexSkills(VARIANT)!;
    expect(
      find(files, ".codex-plugin/skills/cross-review/contracts.md")?.content,
    ).toBe("NO SPAWN HERE");
  });

  it("rewrites a spawn skill file with the self-load protocol", () => {
    const files = buildCodexSkills(VARIANT)!;
    const skill = find(files, ".codex-plugin/skills/cross-review/SKILL.md");
    expect(skill?.content).toContain("<!-- codex-persona-spawn");
    expect(skill?.content).toContain("`../_shared/personas/<id>.md`");
    // original frontmatter + body survive
    expect(skill?.content.startsWith("---\nname: x\n---\n")).toBe(true);
    expect(skill?.content).toContain('subagent_type: "filid:code-surgeon"');
  });

  it("drops every persona under _shared/personas/", () => {
    const files = buildCodexSkills(VARIANT)!;
    expect(
      find(files, ".codex-plugin/skills/_shared/personas/code-surgeon.md")
        ?.content,
    ).toBe("PERSONA-A");
    expect(
      find(files, ".codex-plugin/skills/_shared/personas/adjudicator.md")
        ?.content,
    ).toBe("PERSONA-B");
  });

  it("keeps every path under the Codex skills dir and sorted", () => {
    const paths = buildCodexSkills(VARIANT)!.map((f) => f.relativePath);
    for (const p of paths)
      expect(p.startsWith(".codex-plugin/skills/")).toBe(true);
    expect(paths).toEqual([...paths].sort());
  });
});
