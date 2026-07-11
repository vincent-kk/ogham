import { substituteTokens } from "../../tokens/substituteTokens.js";
import type { AgentIR, PluginIR } from "../../types/ir.js";
import type { HostProfile } from "../../types/profile.js";
import { resolverFor } from "./resolverFor.js";

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const WRITE_TOOL = /\b(Write|Edit|Bash)\b/;

/**
 * Build a Codex `.codex-agents/<name>.toml` from an AgentIR. The Claude `tools`
 * whitelist collapses to `sandbox_mode` (read-only vs workspace-write); the body
 * becomes `developer_instructions` (tokens substituted); `model` is emitted only
 * if the profile maps the grade to a slug. `maxTurns` has no Codex equivalent.
 * Frontmatter fields are read tolerantly (not yaml-parsed) since `tools:` grants
 * are tokenized.
 */
export function buildAgentToml(
  agent: AgentIR,
  ir: PluginIR,
  profile: HostProfile,
): string {
  const fm = agent.rawText.match(FRONTMATTER)?.[1] ?? "";
  const body = substituteTokens(
    agent.rawText.replace(FRONTMATTER, ""),
    resolverFor(ir, profile),
  ).replace(/^\n+/, "");

  const description = scalar(fm, "description") ?? "";
  const sandbox = WRITE_TOOL.test(fm) ? "workspace-write" : "read-only";
  const slug = profile.agents.modelSlug(
    scalar(fm, "model") === "opus" ? "deep" : "standard",
  );

  const lines = [
    `name = ${basic(agent.name)}`,
    `description = ${basic(description)}`,
    `sandbox_mode = ${basic(sandbox)}`,
  ];
  if (slug) lines.push(`model = ${basic(slug)}`);
  lines.push(`developer_instructions = ${literalMultiline(body)}`);
  return lines.join("\n") + "\n";
}

/** Read a top-level scalar frontmatter field, stripping surrounding quotes. */
function scalar(frontmatter: string, key: string): string | undefined {
  const m = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!m) return undefined;
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

function basic(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function literalMultiline(s: string): string {
  if (!s.includes("'''")) return `'''\n${s}\n'''`;
  return `"""\n${s.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"')}\n"""`;
}
