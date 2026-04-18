# Schema

## ImplementPlanManifest

```typescript
{
  batch: string;
  run_id: string;
  project_ref: string;
  created_at: string;              // ISO 8601
  source_manifest: "stories" | "devplan";
  groups: BatchGroup[];
  edges: BatchEdge[];
  cycles_broken: BatchCycleBroken[];
  unresolved: string[];
  degraded: boolean;               // true iff source_manifest === "stories"
}

interface BatchGroup {
  group_id: string;                // "G1", "G2", ...
  level: number;                   // 0-based topological level
  can_parallel: boolean;           // true iff more than one item in group
  items: BatchItemRef[];
  depends_on_groups: string[];     // group_ids of immediate predecessors
}

interface BatchItemRef {
  id: string;                      // Story/Task ID (e.g., "S1", "T1")
  kind: "Story" | "Task";
  issue_ref: string | null;        // Jira/GitHub issue reference if created
  rationale: string;
}

interface BatchEdge {
  from: string;                    // item id
  to: string;                      // item id
  source: "story_link" | "task_blocks" | "code_overlap" | "manual";
  weight: number;
}

interface BatchCycleBroken {
  nodes: string[];                 // node ids in cycle order
  resolution: string;              // human-readable: which edge was removed
}
```

## File location

`.imbas/<KEY>/runs/<run-id>/implement-plan.json`
`.imbas/<KEY>/runs/<run-id>/implement-plan-report.md`
