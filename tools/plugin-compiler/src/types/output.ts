/** Compiler output types: the file map, diagnostics, and diffs. */

/** Target host identifier. */
export type HostId = "claude" | "codex" | "agy";

/**
 * The emit result for one host: a relative-path → bytes map.
 * Keys use POSIX separators, rooted at the host's `targets/<host>/`.
 * Deterministic: same IR → same FileMap (byte-identical), so it feeds
 * both the snapshot tests and the Claude byte-equivalence gate.
 */
export type FileMap = Map<string, Buffer>;

/** A build diagnostic. `error` fails the compile; `warning` is surfaced. */
export interface Diagnostic {
  level: "error" | "warning";
  host?: HostId;
  code: string;
  message: string;
}

/** Result of compiling one plugin across all requested hosts. */
export interface CompileResult {
  targets: Partial<Record<HostId, FileMap>>;
  diagnostics: Diagnostic[];
}

/** A single divergence found by the byte-equivalence gate. */
export interface Diff {
  relPath: string;
  kind: "missing" | "unexpected" | "changed";
  /** For `changed`: byte length of expected vs actual. */
  detail?: string;
}
