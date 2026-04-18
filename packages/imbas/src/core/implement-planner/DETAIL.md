# implement-planner — Requirements

## Requirements

- 입력: stories-manifest 또는 stories-manifest + devplan-manifest
- 출력: ImplementPlanManifest (groups, edges, cycles_broken, unresolved, degraded)
- 노드: Story(from stories), Task(from devplan.tasks) — Subtask 제외
- edges:
  - StoryLink.type='blocks': from → each in to
  - StoryLink.type='is-blocked-by': each in to → from
  - TaskItem.blocks[]: task.id → each blocked ID (Story 또는 Task)
- Level 계산: Kahn topological sort
- Group chunking: 동일 level이 max_parallel 초과 시 결정적 순서로 chunk

## API Contracts

```typescript
buildImplementPlan(input: ImplementPlanInput): ImplementPlanResult

interface ImplementPlanInput {
  run_id: string;
  project_ref: string;
  batch: string;
  source: 'stories' | 'devplan';
  stories: StoriesManifest;
  devplan?: DevplanManifest | null;
  max_parallel?: number;
}

interface ImplementPlanResult {
  manifest: ImplementPlanManifest;
}
```

- stories-only (source='stories')은 degraded=true 설정
- max_parallel 생략 시 unlimited (level 내 전체 단일 group)
- cycle 감지 시 최저 weight edge 제거, 결정적 tie-break: from/to 사전순

## Last Updated

- 2026-04-18: 초기 도입
