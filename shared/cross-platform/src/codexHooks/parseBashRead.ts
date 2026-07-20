const READERS = new Set(["cat", "head", "tail", "less", "more", "bat"]);
// pipe, chain, redirect, subshell, variable, glob, newline — anything that makes
// the command more than a bare single-file read.
const SHELL_META = /[|&;<>()$`*?\n]/;

/**
 * Extract the file a simple Codex shell read targets, so a Read-keyed guard
 * (maencof's vault redirector) can engage when the model reads via the shell.
 *
 * Codex exposes no Read tool — the model reads by shelling out (`cat`, `head`,
 * `tail`, `less`, `more`, `bat`), which reaches the hook as `{tool_name:"Bash"}`.
 * Only the simple single-file form is recovered: a bare `<reader> [flags] <path>`
 * with no pipe, redirect, glob, or command chaining. A command carrying shell
 * metacharacters returns null — reads through pipes/grep/awk are unbounded, and
 * Codex itself only forwards the simple shell calls to the hook (docs: "this
 * doesn't intercept all shell calls yet, only the simple ones").
 *
 * The path is returned verbatim (relative or absolute); whether it is in scope
 * (a vault `.md`, an FCA source file) is the caller's concern, not the parser's.
 * Returns null when the command is not a recoverable single-file read.
 */
export function parseBashRead(command: string): string | null {
  if (SHELL_META.test(command)) return null;

  const tokens = command.trim().split(/\s+/);
  if (tokens.length < 2) return null;

  const reader = tokens[0].split("/").pop();
  if (!reader || !READERS.has(reader)) return null;

  const path = tokens[tokens.length - 1];
  // A trailing flag (`head -5 file` → `file`, but `head -5` → `-5`) or a bare
  // flag value (`head -n 50` → `50`) means the command reads stdin, not a file.
  if (path.startsWith("-") || /^\d+$/.test(path)) return null;

  return path;
}
