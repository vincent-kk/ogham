import { CODEX_SKILLS_DIR } from "../../constants/adapterPaths.js";
import type { CodexSkillFile, PluginFacts } from "../../types/index.js";
import {
  containsPersonaSpawn,
  injectSpawnProtocol,
  PERSONA_SUBDIR,
} from "../utils/injectSpawnProtocol.js";

/**
 * Plugins verified relocation-safe for the Codex skill-variant shadow. Emission
 * is per-plugin opt-in — not every `agents/` + `subagent_type` plugin qualifies:
 * a plugin whose worker prompt loads a persona by an actionable bare
 * `../../agents/<id>.md` climb (e.g. prawf: `prompt-templates.md` "Give the
 * persona .md path `../../agents/<id>.md`") BREAKS when its skills move to
 * `.codex-plugin/skills/`, and works as-is on Codex without a variant. Before
 * adding a name, verify (a) its persona spawns depend on the `subagent_type`
 * registry Codex lacks (so the injected protocol drives the load), and (b) its
 * skills reach their own sibling/persona files by paths that survive relocation
 * — a `${CLAUDE_PLUGIN_ROOT}`/Glob fallback or a `../_shared/` ref (copied along),
 * NOT an actionable `../../agents/` persona path.
 *
 * - filid, imbas: registry spawns; live E2E confirmed (codex-cli 0.144.6) —
 *   filid at depth-1, imbas at depth-2. imbas's `agents/*.md` refs are schema
 *   doc pointers, self-satisfied by the self-loaded persona (not an actionable
 *   load path).
 * - entrez, r-statistics: registry spawns, no actionable `../../agents/` path;
 *   sibling refs via `../_shared/` (copied along) or none. Static-verified.
 */
const VARIANT_ENABLED_PLUGINS = new Set([
  "filid",
  "entrez",
  "r-statistics",
  "imbas",
]);

/**
 * Whether this plugin emits a Codex skill variant: opted in, has personas, and
 * has at least one skill that spawns one by `subagent_type`. The manifest builder
 * shares this predicate to decide where `skills` points, so the manifest and the
 * emitted tree never disagree.
 */
export function emitsCodexSkillVariant(facts: PluginFacts): boolean {
  if (!VARIANT_ENABLED_PLUGINS.has(facts.name)) return false;
  if (Object.keys(facts.agentFiles).length === 0) return false;
  return Object.values(facts.skillFiles).some((content) =>
    containsPersonaSpawn(content, facts.name),
  );
}

/**
 * Build the whole `.codex-plugin/skills/` tree for a variant-emitting plugin, or
 * `null` when it does not qualify. Every skill file is copied (discovery is
 * REPLACE, so the manifest can only point at a complete dir); spawn-bearing files
 * are rewritten to self-load their persona; each `agents/<id>.md` is dropped at
 * `_shared/personas/<id>.md`. Output is sorted by path for deterministic,
 * idempotent re-emission. Claude's own `skills/` is never read from here (facts
 * carry the pristine source), so re-runs never double-inject.
 */
export function buildCodexSkills(facts: PluginFacts): CodexSkillFile[] | null {
  if (!emitsCodexSkillVariant(facts)) return null;

  const files: CodexSkillFile[] = [];
  for (const [relativePath, content] of Object.entries(facts.skillFiles)) {
    const emitted = containsPersonaSpawn(content, facts.name)
      ? injectSpawnProtocol(content, relativePath, facts.name)
      : content;
    files.push({
      relativePath: `${CODEX_SKILLS_DIR}/${relativePath}`,
      content: emitted,
    });
  }
  for (const [basename, content] of Object.entries(facts.agentFiles))
    files.push({
      relativePath: `${CODEX_SKILLS_DIR}/${PERSONA_SUBDIR}/${basename}`,
      content,
    });

  files.sort((a, b) =>
    a.relativePath < b.relativePath
      ? -1
      : a.relativePath > b.relativePath
        ? 1
        : 0,
  );
  return files;
}
