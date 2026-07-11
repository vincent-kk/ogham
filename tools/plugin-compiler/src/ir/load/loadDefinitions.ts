import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { PluginIR } from "../../types/ir.js";
import { parseAgent } from "./parseAgent.js";
import { parseHooks } from "./parseHooks.js";
import { parsePluginYaml } from "./parsePluginYaml.js";
import { parseSkill } from "./parseSkill.js";
import { readAssets } from "./readAssets.js";

/**
 * Load a plugin's `definitions/` tree plus its package.json into a host-neutral
 * PluginIR. Version comes from package.json (the repo's single version source);
 * assets come from package.json `files`. Agents and hooks load when present.
 */
export function loadDefinitions(pkgDir: string): PluginIR {
  const defDir = join(pkgDir, "definitions");
  const manifest = parsePluginYaml(
    readFileSync(join(defDir, "plugin.yaml"), "utf8"),
  );

  const pkg = JSON.parse(
    readFileSync(join(pkgDir, "package.json"), "utf8"),
  ) as {
    version?: string;
  };
  if (!pkg.version) throw new Error(`${pkgDir}/package.json has no version`);

  const { hookOverrides, ...manifestFields } = manifest;
  const skills = skillDirs(join(defDir, "skills")).map(parseSkill);
  const agents = mdFiles(join(defDir, "agents")).map(parseAgent);
  const hooksFile = join(defDir, "hooks.json");
  const hasHooks = existsSync(hooksFile);
  const hooks = hasHooks ? parseHooks(hooksFile, hookOverrides) : [];
  const hooksRaw = hasHooks ? readFileSync(hooksFile, "utf8") : undefined;
  const runtimeFiles = readAssets(pkgDir);

  return {
    ...manifestFields,
    version: pkg.version,
    skills,
    agents,
    hooks,
    hooksRaw,
    runtimeFiles,
  };
}

/** Skill directories: non-dot subdirs that actually contain a SKILL.md. */
function skillDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => join(dir, e.name))
    .filter((d) => existsSync(join(d, "SKILL.md")))
    .sort();
}

function mdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."),
    )
    .map((e) => join(dir, e.name))
    .sort();
}
