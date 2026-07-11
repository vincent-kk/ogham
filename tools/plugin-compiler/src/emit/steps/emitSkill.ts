import { substituteTokens } from "../../tokens/substituteTokens.js";
import type { PluginIR, SkillIR } from "../../types/ir.js";
import type { FileMap } from "../../types/output.js";
import type { HostProfile } from "../../types/profile.js";
import { dropFrontmatterKeys } from "./dropFrontmatterKeys.js";
import { resolverFor } from "./resolverFor.js";

/**
 * Emit one skill for a host: SKILL.md with tokens substituted and host-dropped
 * frontmatter keys removed, plus supporting files (`.md` token-substituted,
 * others byte-verbatim) under the profile's skill directory.
 */
export function emitSkill(
  skill: SkillIR,
  ir: PluginIR,
  profile: HostProfile,
): FileMap {
  const resolve = resolverFor(ir, profile);
  const dir = profile.skillDir(skill.name);
  const files: FileMap = new Map();

  let text = substituteTokens(skill.rawText, resolve);
  if (profile.dropSkillFrontmatterKeys.length)
    text = dropFrontmatterKeys(text, profile.dropSkillFrontmatterKeys);
  files.set(`${dir}/SKILL.md`, Buffer.from(text, "utf8"));

  for (const file of skill.supportingFiles) {
    const bytes = file.relPath.endsWith(".md")
      ? Buffer.from(
          substituteTokens(file.bytes.toString("utf8"), resolve),
          "utf8",
        )
      : file.bytes;
    files.set(`${dir}/${file.relPath}`, bytes);
  }
  return files;
}
