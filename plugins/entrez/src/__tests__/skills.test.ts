import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILLS = join(PKG_ROOT, "skills");
const AGENTS = join(PKG_ROOT, "agents");

function frontmatter(path: string): string {
  const m = readFileSync(path, "utf-8").match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}

const EXPOSED = ["search", "query", "download", "setup"];

describe("exposed skills", () => {
  it("exposes exactly the 4 designed skills", () => {
    const dirs = readdirSync(SKILLS, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name)
      .filter((name) => existsSync(join(SKILLS, name, "SKILL.md")));
    expect(dirs.sort()).toEqual([...EXPOSED].sort());
  });

  it("each SKILL.md has the required frontmatter fields", () => {
    for (const name of EXPOSED) {
      const fm = frontmatter(join(SKILLS, name, "SKILL.md"));
      expect(fm, `${name} name`).toMatch(new RegExp(`name:\\s*${name}\\b`));
      expect(fm, `${name} user_invocable`).toMatch(/user_invocable:\s*true/);
      expect(fm, `${name} description`).toContain("[entrez:");
      expect(fm, `${name} plugin`).toMatch(/plugin:\s*entrez/);
      expect(fm, `${name} version`).toMatch(/version:/);
      expect(fm, `${name} complexity`).toMatch(
        /complexity:\s*(simple|moderate|complex)/,
      );
    }
  });

  it("search is the complex Dispatcher", () => {
    expect(frontmatter(join(SKILLS, "search", "SKILL.md"))).toMatch(
      /complexity:\s*complex/,
    );
  });

  it("ships the lazy _shared references", () => {
    expect(existsSync(join(SKILLS, "_shared", "mcp-tools.md"))).toBe(true);
    expect(existsSync(join(SKILLS, "_shared", "eutils.md"))).toBe(true);
  });
});

describe("paper-search-expert agent", () => {
  const fm = frontmatter(join(AGENTS, "paper-search-expert.md"));

  it("has name, model, maxTurns and the two MCP tools", () => {
    expect(fm).toMatch(/name:\s*paper-search-expert/);
    expect(fm).toMatch(/model:\s*sonnet/);
    expect(fm).toMatch(/maxTurns:\s*15/);
    expect(fm).toContain("mcp_tools_paper_search");
    expect(fm).toContain("mcp_tools_mesh_lookup");
    expect(fm).toContain("Read");
  });

  it("ships the generation + rerank methodology references in _shared (SSoT)", () => {
    expect(existsSync(join(SKILLS, "_shared", "query-strategy.md"))).toBe(true);
    expect(existsSync(join(SKILLS, "_shared", "rerank.md"))).toBe(true);
  });

  it("keeps agents/ flat — no subdirectories (plugin loader requirement)", () => {
    const entries = readdirSync(AGENTS, { withFileTypes: true });
    expect(entries.filter((e) => e.isDirectory())).toEqual([]);
    expect(entries.every((e) => e.isFile() && e.name.endsWith(".md"))).toBe(
      true,
    );
  });
});
