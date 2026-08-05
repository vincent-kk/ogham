# State Transitions

```
Entry state:
  refine.status = "completed", refine.result in ["PASS", "PASS_WITH_WARNINGS"]
  estimate.status in ["completed", "skipped"]
  split.status = "pending"

During execution:
  start_phase("split") → split.status = "in_progress"

Exit states:
  complete_phase("split", pending_review=false, stories_created=N):
    → split.status = "completed" — issues created on the provider

  complete_phase("split", pending_review=true):
    → split.status = "completed", split.pending_review = true
    → manifest saved but not executed; re-run /imbas:split --run <run-id> to create

  escape_phase("split", escape_code="E2-1"):
    → split.status = "escaped" — needs human elaboration

  escape_phase("split", escape_code="E2-2"):
    → split.status = "escaped" — needs human decision on conflicts

  escape_phase("split", escape_code="E2-3"):
    → split.status = "escaped" — decomposition unnecessary; a single-Story
      manifest was saved, and creation may proceed on re-run approval

  escape_phase("split", escape_code="EC-1"):
    → split.status = "escaped" — uninterpretable, scope frozen

  escape_phase("split", escape_code="EC-2"):
    → split.status = "escaped" — source defect, re-refinement recommended
```

# Output

- `stories-manifest.json` at `.imbas/<KEY>/runs/<run-id>/stories-manifest.json` — the decomposition AND the creation ledger: per-item `issue_ref`/`status` fields record creation progress and drive idempotent resume.
- Created issues on the provider — Jira issues, GitHub issues, or `.imbas/<KEY>/issues/*.md` files.

Schema: `src/types/manifest.ts` (`StoriesManifestSchema`, version 2).
