# Escape Condition Detection

During the splitting process, if any of these conditions are detected, IMMEDIATELY escape with a structured report ("escape is a report" principle):

| Code | Situation                                    | Action                                                         |
| ---- | -------------------------------------------- | -------------------------------------------------------------- |
| E2-1 | Needs elaboration — insufficient information | List missing information items + request human supplementation |
| E2-2 | Contradiction/conflict discovered            | Specify conflict points + request human decision               |
| E2-3 | Split unnecessary — already appropriate size | Single-Story manifest saved; creation may proceed              |
| EC-1 | Cannot comprehend — uninterpretable          | Freeze scope + structure queries for clarification             |
| EC-2 | Source defect discovered                     | Generate defect report (recommend /imbas:refine re-run)        |

On escape:

1. For E2-3 only: generate a single-Story stories-manifest.json wrapping the refined document as one Story (the document is already appropriate size). Call mcp__plugin_imbas_tools__manifest_save to persist it before escaping.
2. Call mcp__plugin_imbas_tools__run_transition:
   - action: "escape_phase", phase: "split", escape_code: "<code>" → Sets split.status = "escaped", split.escape_code = "<code>"
3. Emit terminal marker: "Escape code: <code>" (literal `<code>` is one of `E2-1`, `E2-2`, `E2-3`, `EC-1`, `EC-2`).
4. Display structured escape report to user.
5. For E2-3: inform user that re-running /imbas:split --run <run-id> offers creation of the single-Story manifest.
6. For E2-1, E2-2, EC-1, EC-2: inform user that human intervention is required before the pipeline can continue.
