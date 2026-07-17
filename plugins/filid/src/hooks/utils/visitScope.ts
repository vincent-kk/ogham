import type { VisitScope } from '../../core/infra/cacheManager/cacheManager.js';
import type { HookBaseInput } from '../../types/hooks.js';

/**
 * Derive the cache scope of a hook event. A subagent tool call carries a
 * transcript_path pointing at its own agent transcript (not the main
 * `<session_id>.jsonl`), which isolates its visit/delivery state from the
 * main session. Hosts that omit or unify transcript_path fall back to the
 * shared session scope — today's behavior, never worse.
 */
export function visitScope(input: HookBaseInput): VisitScope {
  const transcript = input.transcript_path;
  if (!transcript) return { sessionId: input.session_id };
  const base = transcript.replace(/\\/g, '/').split('/').pop() ?? '';
  const name = base.endsWith('.jsonl') ? base.slice(0, -6) : base;
  if (!name || name === input.session_id)
    return { sessionId: input.session_id };
  return { sessionId: input.session_id, sub: name };
}
