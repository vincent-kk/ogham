---
id: packages-atlassian-src-mcp-tools-fetch-utils-683865
fractal_path: packages/atlassian/src/mcp/tools/fetch/utils
file_path: packages/atlassian/src/mcp/tools/fetch/utils/convert-body-for-create.ts
created_at: "2026-04-29T14:31:00Z"
review_branch: feat/atlassian-fetch-server-dc-markdown
original_fix_id: FIX-006
severity: LOW
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: DRY / knowledge-duplication (advisory)
metric_value: convert-body-for-create and convert-body-for-update have 100% identical bodies
---

# 기술 부채: convert-body-for-create and convert-body-for-update body duplication
## 원래 수정 요청
두 파일이 동일한 필드 변환 경로(description, body, fields.description)와 동일한 pickBodyFormat + renderByFormat 호출 패턴을 갖는다. 현재 시점에서 두 함수의 동작은 100% 동일.
## 개발자 소명
Fix request explicitly states '차기 PR에서 처리. 현 PR에서는 의도된 분리(HTTP semantics)이므로 머지 차단 사유 아님' (defer to next PR; intentional split by HTTP semantics, not a merge blocker). The two functions are kept as separate names so that future divergence (e.g., PUT-only field stripping) can be added without touching POST callers.
## 정제된 ADR
Context: review FIX-006 noted that convert-body-for-create and convert-body-for-update share 100% identical body code, raising knowledge-duplication concerns.
Decision: Defer consolidation. The split is intentional along the HTTP-semantics axis (POST vs PUT/PATCH); collapsing them now would re-couple the call sites to a single function and force a flag parameter when the first divergence appears.
Consequences: Two files must be edited in lockstep until they diverge. Tracked here so a future PR introducing first-divergence (or, alternatively, a follow-up that consolidates with no divergence after N months) can resolve this debt.
