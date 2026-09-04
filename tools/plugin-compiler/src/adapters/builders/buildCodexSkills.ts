import { CODEX_SKILLS_DIR } from "../../constants/adapterPaths.js";
import type { CodexSkillFile, PluginFacts } from "../../types/index.js";
import { adaptAsyncAgentLifecycle } from "../utils/adaptAsyncAgentLifecycle.js";
import { AsyncAgentLifecycleError } from "../utils/asyncAgentLifecycleError.js";
import {
  containsPersonaSpawn,
  injectSpawnProtocol,
  PERSONA_SUBDIR,
} from "../utils/injectSpawnProtocol.js";

/**
 * Plugins verified relocation-safe for the persona-registry Codex skill shadow.
 * This allowlist only governs inferred `subagent_type` adaptation. An explicit
 * async-agent lifecycle marker is its own author-controlled opt-in and bypasses
 * the list — not every unmarked `agents/` + `subagent_type` plugin qualifies:
 * a plugin whose worker prompt loads a persona by an actionable bare
 * `../../agents/<id>.md` climb (e.g. prawf: `prompt-templates.md` "Give the
 * persona .md path `../../agents/<id>.md`") BREAKS when its skills move to
 * `.codex-plugin/skills/`, and works as-is on Codex without a variant. Before
 * adding a name, verify (a) its persona spawns depend on the `subagent_type`
 * registry Codex lacks (so the injected protocol drives the load), and (b) its
 * skills reach their own sibling/persona files by paths that survive relocation
 * — a `${CLAUDE_PLUGIN_ROOT}`/Glob fallback or a `../.shared/` ref (copied along),
 * NOT an actionable `../../agents/` persona path.
 *
 * - filid, imbas: registry spawns; live E2E confirmed (codex-cli 0.144.6) —
 *   filid at depth-1, imbas at depth-2. imbas's `agents/*.md` refs are schema
 *   doc pointers, self-satisfied by the self-loaded persona (not an actionable
 *   load path).
 * - entrez, r-statistics: registry spawns, no actionable `../../agents/` path;
 *   sibling refs via `../.shared/` (copied along) or none. Static-verified.
 */
const VARIANT_ENABLED_PLUGINS = new Set([
  "filid",
  "entrez",
  "r-statistics",
  "imbas",
]);

/**
 * Whether this plugin emits a Codex skill variant: either a valid explicit
 * lifecycle marker exists, or the plugin is allowlisted and has a persona spawn
 * that needs registry adaptation. The manifest builder shares this predicate so
 * its `skills` path and the emitted tree never disagree.
 */
export function emitsCodexSkillVariant(facts: PluginFacts): boolean {
  let hasLifecycleAdaptation = false;
  for (const [relativePath, content] of Object.entries(facts.skillFiles)) {
    const adaptation = adaptAsyncAgentLifecycle(
      content,
      relativePath,
      facts.name,
    );
    if (!adaptation) continue;
    assertPersonasExist(facts, adaptation.personaFiles, relativePath);
    hasLifecycleAdaptation = true;
  }
  if (hasLifecycleAdaptation) return true;

  if (!VARIANT_ENABLED_PLUGINS.has(facts.name)) return false;
  if (Object.keys(facts.agentFiles).length === 0) return false;
  return Object.values(facts.skillFiles).some((content) =>
    containsPersonaSpawn(content, facts.name),
  );
}

/**
 * Build the whole `.codex-plugin/skills/` tree for a variant-emitting plugin, or
 * `null` when it does not qualify. Every skill file is copied (discovery is
 * REPLACE, so the manifest can only point at a complete dir); registry-spawn
 * files self-load their persona and lifecycle-marked files select Codex child
 * semantics. Each `agents/<id>.md` is dropped at `.shared/personas/<id>.md`.
 * Output is sorted by path for deterministic, idempotent re-emission. Claude's
 * own `skills/` is never written here (facts carry the pristine source), so
 * re-runs never double-inject.
 */
export function buildCodexSkills(facts: PluginFacts): CodexSkillFile[] | null {
  if (!emitsCodexSkillVariant(facts)) return null;

  const files: CodexSkillFile[] = [];
  for (const [relativePath, content] of Object.entries(facts.skillFiles)) {
    const lifecycle = adaptAsyncAgentLifecycle(
      content,
      relativePath,
      facts.name,
    );
    const selectedContent = lifecycle?.content ?? content;
    const emitted = containsPersonaSpawn(selectedContent, facts.name)
      ? injectSpawnProtocol(selectedContent, relativePath, facts.name)
      : selectedContent;
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

function assertPersonasExist(
  facts: PluginFacts,
  personaFiles: string[],
  relativeSkillPath: string,
): void {
  for (const personaFile of personaFiles)
    if (!(personaFile in facts.agentFiles))
      throw new AsyncAgentLifecycleError(
        `${relativeSkillPath} references missing agents/${personaFile}`,
      );
}
