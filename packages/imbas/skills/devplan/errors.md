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
