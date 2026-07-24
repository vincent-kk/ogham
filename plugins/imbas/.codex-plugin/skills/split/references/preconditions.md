# Preconditions

From state.json:
- `validate.status == "completed"`
- `validate.result` in `["PASS", "PASS_WITH_WARNINGS"]`

If not met → error: "Phase 1 (validate) must complete with PASS before splitting. Run /imbas:validate first."
