# imbas-status — Error Handling & State Transitions

## Error Handling

| Error | Action |
|-------|--------|
| No config.json found | Display: "imbas not initialized. Run /imbas:setup first." |
| No project key configured | Display: "No default project. Run /imbas:setup set-project <KEY>." |
| Run not found | Display: "Run <run-id> not found in project <KEY>." |
| Corrupted state.json | Display: "State file corrupted for run <run-id>. Manual inspection needed at <path>." |

## State Transitions

This skill is read-only. It does not modify state.json or any manifest files.
