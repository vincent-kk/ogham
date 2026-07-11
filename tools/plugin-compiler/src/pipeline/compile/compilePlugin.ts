import { emitPlugin, lintHooks, lintSkillTokens } from "../../emit/index.js";
import { loadDefinitions } from "../../ir/index.js";
import { availableHosts, getProfile } from "../../profiles/index.js";
import type {
  CompileResult,
  Diagnostic,
  FileMap,
  HostId,
} from "../../types/output.js";

/**
 * Compile a plugin's `definitions/` into per-host FileMaps. Pure — no disk
 * writes. Emit failures land in `diagnostics` (error) rather than throwing, so
 * one bad host does not abort the others.
 */
export function compilePlugin(
  pkgDir: string,
  hosts?: readonly HostId[],
): CompileResult {
  const ir = loadDefinitions(pkgDir);
  const targets: Partial<Record<HostId, FileMap>> = {};
  const diagnostics: Diagnostic[] = [];

  for (const host of hosts ?? availableHosts())
    try {
      const profile = getProfile(host);
      const target = emitPlugin(ir, profile);
      for (const problem of lintSkillTokens(target))
        diagnostics.push({
          level: "error",
          host,
          code: "unresolved-token",
          message: problem,
        });
      for (const warning of lintHooks(ir, profile))
        diagnostics.push({
          level: "warning",
          host,
          code: "hook-loss",
          message: warning,
        });
      targets[host] = target;
    } catch (error) {
      diagnostics.push({
        level: "error",
        host,
        code: "emit-failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }

  return { targets, diagnostics };
}
