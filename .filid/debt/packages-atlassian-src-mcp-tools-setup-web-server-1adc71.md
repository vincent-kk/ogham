---
id: packages-atlassian-src-mcp-tools-setup-web-server-1adc71
fractal_path: packages/atlassian/src/mcp/tools/setup/web-server
file_path: packages/atlassian/src/mcp/tools/setup/web-server/routes.ts
created_at: "2026-04-29T14:31:00Z"
review_branch: feat/atlassian-fetch-server-dc-markdown
original_fix_id: FIX-002
severity: MEDIUM
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: schema-data-parity
metric_value: cloud branch save path drops api_version_override; display path now reads it (commit 2e2021cc)
---

# 기술 부채: Cloud save branch does not persist api_version_override
## 원래 수정 요청
Cloud 분기에서 cloud_sites 배열을 생성할 때 api_version_override 필드가 누락. 분기 간 일관성 깨짐. Cloud Jira를 v2 API로 명시 고정해야 하는 엣지 케이스에서 사용자 입력이 무시됨.
## 개발자 소명
User commit 2e2021cc (post-review) added api_version_override to buildEditableSitesState (display/load path) and refined deployment_type detection. The cloud SAVE branch deliberately does not persist api_version_override because Cloud Jira is always v3 in the deployed product surface; allowing override on Cloud is an unsupported edge that the schema permits but the UI does not expose. Treating the gap as intentional design rather than a bug.
## 정제된 ADR
Context: review FIX-002 flagged that cloud branch in handleSubmit omits api_version_override when constructing site entries, while on-prem branch persists it.
Decision: Defer the cloud-branch save addition. Cloud Jira product surface is API v3 only; the override field exists in the schema for completeness but is not surfaced in Cloud UI. Display-path consistency is maintained by commit 2e2021cc.
Consequences: Schema permits cloud + override input via direct credentials.json edits; that input is currently silently dropped on the next form submit. If a future need surfaces (Cloud-instance variants requiring v2 fallback), revisit by adding api_version_override to the cloud sites map and exposing it on the cloud form.
