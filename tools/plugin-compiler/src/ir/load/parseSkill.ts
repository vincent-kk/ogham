import { basename } from "node:path";
import { parse } from "yaml";
import { readTree } from "../../fsx/readTree.js";
import type { ExtraFile, SkillIR } from "../../types/ir.js";

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;

/**
 * Parse one `definitions/skills/<name>/` directory into a SkillIR. `rawText` is
 * the whole SKILL.md (kept verbatim for format-preserving emit); every other
 * file becomes a supporting file, byte-preserved.
 */
export function parseSkill(skillDir: string): SkillIR {
  const name = basename(skillDir);
  const tree = readTree(skillDir);
  const skillMd = tree.get("SKILL.md");
  if (!skillMd) throw new Error(`skill '${name}' has no SKILL.md`);

  const rawText = skillMd.toString("utf8");
  const fm = rawText.match(FRONTMATTER);
  const frontmatterKeys = fm
    ? ((parse(fm[1]) ?? {}) as Record<string, unknown>)
    : {};

  const supportingFiles: ExtraFile[] = [...tree]
    .filter(([rel]) => rel !== "SKILL.md")
    .map(([relPath, bytes]) => ({ relPath, bytes }))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  return { name, rawText, frontmatterKeys, supportingFiles };
}
