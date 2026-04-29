---
id: packages-atlassian-src-mcp-tools-fetch-utils-5fb0e6
fractal_path: packages/atlassian/src/mcp/tools/fetch/utils
file_path: packages/atlassian/src/mcp/tools/fetch/utils/render-by-format.ts
created_at: "2026-04-29T14:31:00Z"
review_branch: feat/atlassian-fetch-server-dc-markdown
original_fix_id: FIX-004
severity: LOW
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: pure-function-isolation (advisory)
metric_value: utils/ organ has 1 dependency on converter/ fractal via converter/index.js (entry-point compliant)
---

# 기술 부채: utils organ -> converter fractal dependency direction monitoring
## 원래 수정 요청
renderByFormat이 converter/index.js를 경유하여 임포트 — FCA 엔트리포인트 규칙 준수. 단, utils/ organ에서 상위 converter/ fractal 의존이 누적될 경우 LCA 이동 압력.
## 개발자 소명
Fix request itself states '즉시 수정 불필요' (no immediate action). The utils/ → converter/ dependency goes through the public entry point and does not violate FCA rules. This is a monitoring item, recorded so a future PR adding more converter dependencies in utils/ will trigger the LCA review.
## 정제된 ADR
Context: review FIX-004 noted that the new render-by-format.ts (after FIX-001 split) imports markdown-to-* converters from utils/, an organ depending on a sibling fractal.
Decision: Accept the dependency. The import goes through converter/index.js (FCA entry-point compliant), and the call site is the only converter consumer in utils/.
Consequences: If a second utils/ file imports converter/ in the future, promote pick-body-format / render-by-format up to the fetch/ fractal root via LCA. Tracked here as a monitoring debt with no immediate action.
