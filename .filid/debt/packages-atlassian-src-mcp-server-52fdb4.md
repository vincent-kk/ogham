---
id: packages-atlassian-src-mcp-server-52fdb4
fractal_path: packages/atlassian/src/mcp/server
file_path: packages/atlassian/src/mcp/server/server.ts
created_at: "2026-04-29T14:31:00Z"
review_branch: feat/atlassian-fetch-server-dc-markdown
original_fix_id: FIX-005
severity: LOW
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: LCA (anticipatory, not currently violated)
metric_value: buildFetchContext is module-private to server.ts with one consumer
---

# 기술 부채: buildFetchContext placement (server.ts inline) — extract when Confluence override lands
## 원래 수정 요청
buildFetchContext가 server.ts의 module-private 함수. 단일 소비자이므로 현재 위치는 정당화되나, Confluence api_version_override 추가 시 분기/복제 압력.
## 개발자 소명
Fix request explicitly states '현 PR 범위에서는 수정 불필요' (no action this PR). Single consumer today, so module-private is the correct placement under reuse-first. Refactor is anticipatory and tied to a future feature (Confluence api_version_override).
## 정제된 ADR
Context: review FIX-005 flagged that buildFetchContext lives inside server.ts; once Confluence gains an api_version_override of its own, the function will face duplication pressure.
Decision: Defer extraction until Confluence override is implemented. Premature LCA promotion would add an interface boundary with a single consumer.
Consequences: When a second consumer (Confluence override branch) appears, move buildFetchContext to core/ or mcp/shared/ and update both call sites. Tracked here so the future PR is reminded to do the move atomically.
