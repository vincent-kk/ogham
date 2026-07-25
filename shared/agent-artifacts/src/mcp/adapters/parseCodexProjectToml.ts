import { parse } from "smol-toml";

import type { CodexProjectTomlParseResult } from "./adapterTypes.js";

const MAX_CODEX_TOML_BYTES = 1024 * 1024;

export function parseCodexProjectToml(
  source: string,
): CodexProjectTomlParseResult {
  if (new TextEncoder().encode(source).byteLength > MAX_CODEX_TOML_BYTES)
    return {
      ok: false,
      reason: "Codex project TOML exceeds the 1 MiB limit",
    };

  try {
    const value = parse(source) as Readonly<Record<string, unknown>>;
    return { ok: true, value };
  } catch {
    return { ok: false, reason: "invalid Codex project TOML" };
  }
}
