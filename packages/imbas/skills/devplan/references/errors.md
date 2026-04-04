# Error Handling

## Error Handling

| Error | Action |
|-------|--------|
| Split not completed/reviewed | Display: "Phase 2 must be completed and reviewed. Run /imbas:split first." |
| Stories not in Jira (pending) | Display: "Stories must exist in Jira. Run /imbas:manifest stories first." |
| AST tools unavailable (sgLoadError) | Log warning once, switch to LLM fallback mode. Continue execution. |
| imbas-engineer fails | Save partial manifest if available. Display: "Engineer agent error. Partial results saved. Re-run with --stories to complete." |
| Manifest validation errors | Display errors. Allow user to fix and re-approve. |
| No Subtasks generated for a Story | Flag Story in review. Display: "Story <ID> produced no Subtasks — verify Story scope." |
| imbas_run_transition fails | Display precondition error from tool. |
| imbas-engineer returns blocked report | Set devplan output to "devplan-blocked-report.md". Display blocked dependencies and suggested resolutions. If partial manifest exists, note: "Partial devplan available for unblocked Stories." |
| All Stories blocked — no manifest generated | Display full blocked report. Guidance: "Resolve blocking dependencies, then re-run /imbas:devplan." |
