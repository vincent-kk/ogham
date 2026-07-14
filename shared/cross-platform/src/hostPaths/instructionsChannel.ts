import {
  CLAUDE_INSTRUCTIONS_FILE,
  CODEX_INSTRUCTIONS_FILE,
} from "../instructions/index.js";

import { detectHost } from "./detectHost.js";
import type { RuleDocsTarget } from "./types.js";

/** Where Claude Code expects rule documents — one markdown file per rule. */
const CLAUDE_RULE_DOCS_DIR = ".claude/rules";

/**
 * The file this host actually reads as project instructions.
 *
 * Codex ignores `CLAUDE.md` entirely and reads `AGENTS.md` (repo root and global, both
 * injected, and they stack) — measured with `codex debug prompt-input`. Writing to the
 * wrong one is not an error, it is a silent no-op: the file appears, and the model
 * never sees it.
 *
 * agy is unmeasured. It keeps Claude's answer so that nothing regresses there, and so
 * that we are not claiming support we have not earned — `GEMINI.md` and `AGENTS.md` are
 * both candidates and neither has been observed.
 */
export function instructionsFile(): string {
  return detectHost() === "codex"
    ? CODEX_INSTRUCTIONS_FILE
    : CLAUDE_INSTRUCTIONS_FILE;
}

/**
 * How rule documents reach this host: a directory of files, or sections merged into the
 * single instruction file.
 *
 * The shapes differ because the hosts do. Claude reads every file under `.claude/rules`;
 * Codex reads exactly one file, so a directory has no meaning there and each rule
 * document has to become an addressable span of `AGENTS.md` instead.
 *
 * agy — unmeasured, so it stays on Claude's channel (see `instructionsFile`).
 */
export function ruleDocsTarget(): RuleDocsTarget {
  return detectHost() === "codex"
    ? { kind: "merge", file: CODEX_INSTRUCTIONS_FILE }
    : { kind: "directory", path: CLAUDE_RULE_DOCS_DIR };
}
