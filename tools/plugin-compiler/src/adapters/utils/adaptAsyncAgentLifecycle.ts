import { AsyncAgentLifecycleError } from "./asyncAgentLifecycleError.js";
import { PERSONA_SUBDIR } from "./injectSpawnProtocol.js";
import { renderCodexAsyncAgentBlock } from "./renderCodexAsyncAgentBlock.js";

// Loaded by buildCodexSkills; marker placement selects the Claude-visible text
// that the generated Codex skill replaces with its explicit child lifecycle.
const BLOCK_PATTERN =
  /<!-- ogham-async-agent:(spawn|join) ([a-z][a-z0-9-]*):([a-z][a-z0-9-]*) -->\r?\n[\s\S]*?\r?\n<!-- ogham-async-agent:end -->/g;
const OPEN_MARKER_PATTERN = /<!-- ogham-async-agent:(?!end\b)[^>]*-->/g;
const END_MARKER_PATTERN = /<!-- ogham-async-agent:end -->/g;

export function adaptAsyncAgentLifecycle(
  content: string,
  relativeSkillPath: string,
  pluginName: string,
): { content: string; personaFiles: string[] } | null {
  const openCount = content.match(OPEN_MARKER_PATTERN)?.length ?? 0;
  const endCount = content.match(END_MARKER_PATTERN)?.length ?? 0;
  if (openCount === 0 && endCount === 0) return null;

  const matches = [...content.matchAll(BLOCK_PATTERN)];
  if (matches.length !== openCount || matches.length !== endCount)
    throw new AsyncAgentLifecycleError(
      `malformed async-agent marker in ${relativeSkillPath}`,
    );

  const lifecyclePhases = new Map<string, Array<"spawn" | "join">>();
  const personaFiles = new Set<string>();
  const depth = relativeSkillPath.split("/").length - 1;
  const personaRoot = `${"../".repeat(depth)}${PERSONA_SUBDIR}`;

  for (const match of matches) {
    const phase = match[1] as "spawn" | "join";
    const markerPlugin = match[2];
    const agentId = match[3];
    if (markerPlugin !== pluginName)
      throw new AsyncAgentLifecycleError(
        `async-agent marker in ${relativeSkillPath} must name plugin ${pluginName}`,
      );

    const role = `${markerPlugin}:${agentId}`;
    const phases = lifecyclePhases.get(role) ?? [];
    phases.push(phase);
    lifecyclePhases.set(role, phases);
    personaFiles.add(`${agentId}.md`);
  }

  for (const [role, phases] of lifecyclePhases)
    if (phases.length !== 2 || phases[0] !== "spawn" || phases[1] !== "join")
      throw new AsyncAgentLifecycleError(
        `async-agent lifecycle for ${role} in ${relativeSkillPath} requires one spawn and one join, in that order`,
      );

  let adapted = content;
  for (const match of [...matches].reverse()) {
    const phase = match[1] as "spawn" | "join";
    const markerPlugin = match[2];
    const agentId = match[3];
    const start = match.index ?? 0;
    const replacement = renderCodexAsyncAgentBlock(
      phase,
      markerPlugin,
      agentId,
      `${personaRoot}/${agentId}.md`,
    );
    adapted = `${adapted.slice(0, start)}${replacement}${adapted.slice(start + match[0].length)}`;
  }

  return { content: adapted, personaFiles: [...personaFiles].sort() };
}
