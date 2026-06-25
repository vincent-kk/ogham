import { FORBIDDEN_R_CALLS } from "../../../constants/defaults.js";

export interface RScriptValidation {
  ok: boolean;
  blockedCalls: string[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Static execution-safety scan of user R code. Flags forbidden call sites
 * (process spawning, filesystem escape, dynamic install, network) by matching
 * `<call>(` on a word boundary. Statistical correctness is NOT evaluated here.
 */
export function validateRScript(scriptCode: string): RScriptValidation {
  const blocked = new Set<string>();
  for (const call of FORBIDDEN_R_CALLS) {
    if (new RegExp(`\\b${escapeRegex(call)}\\s*\\(`).test(scriptCode)) {
      blocked.add(call);
    }
  }
  if (/do\.call\s*\(\s*["']/.test(scriptCode)) {
    blocked.add("do.call(string)");
  }
  if (/get\s*\(\s*["'][^"']+["']\s*\)/.test(scriptCode)) {
    blocked.add("get(string)");
  }
  return { ok: blocked.size === 0, blockedCalls: [...blocked] };
}
