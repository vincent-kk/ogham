# Workflow

## Steps

1. **Resolve run**:
   - If `--run` provided, use it.
   - Otherwise call `mcp_tools_run_list` to find the most recent run satisfying
     the source precondition.
2. **Call the planner tool**:
   ```json
   mcp_tools_manifest_implement_plan {
     project_ref: <from config>,
     run_id: <resolved>,
     source: "devplan" | "stories",
     max_parallel: <number | undefined>
   }
   ```
3. **Inspect result**:
   - `summary.total_groups`, `summary.total_items`, `summary.max_level`
   - `summary.cycles_broken` (> 0 means the DAG had cycles, resolved deterministically)
   - `summary.unresolved` (> 0 means some nodes could not be leveled — rare)
   - `summary.degraded` (true for stories-only mode)
4. **Optional validation**:
   - `mcp_tools_manifest_validate {type: "implement-plan"}` to cross-check
     reference integrity.
5. **Emit terminal marker** with the report path:
   ```
   Implement plan generated: .imbas/<KEY>/runs/<run-id>/implement-plan-report.md
   - groups: N, items: M, max_level: L
   - cycles_broken: X, unresolved: Y, degraded: true|false
   ```

## Tool matrix

| Purpose | MCP tool |
|---|---|
| Find recent run | `mcp_tools_run_list` |
| Read run state | `mcp_tools_run_get` |
| Build + persist plan | `mcp_tools_manifest_implement_plan` |
| Validate plan | `mcp_tools_manifest_validate` |
| Read plan | `mcp_tools_manifest_get` with `type: "implement-plan"` |
