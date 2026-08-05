# CLAUDE.md — @ogham/imbas

The current contract is [INTENT.md](./INTENT.md); source boundaries are [src/INTENT.md](./src/INTENT.md); the behavior spec is the [`.metadata/imbas/`](../../.metadata/imbas/README.md) v2 document set (spec·skills·estimation·mcp-tools·storage·architecture).

## Pipeline continuity

- Multi-stage skills declare continuous execution in their top `EXECUTION MODEL` and, after each MCP, subagent, or provider return, continue to the next stage in the same turn. Never end a turn on an intermediate-artifact summary.
- The pipeline is `refine → estimate (skippable) → split`. Inside `split`, the decompose → approval-gate → create sequence is one continuous flow: after the user approves the stories manifest, creation starts in the same turn, and per-item `issue_ref`/`status` is recorded immediately after each provider write.
- When a skill executes one provider it must not read another provider's `references/`. Provider-neutral contracts live only on provider-neutral paths; Jira interactions are expressed as `[OP:<name>]` semantic operations resolved against the session's Atlassian tools.
