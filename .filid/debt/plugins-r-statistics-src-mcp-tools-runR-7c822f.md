---
id: plugins-r-statistics-src-mcp-tools-runR-7c822f
fractal_path: plugins/r-statistics/src/mcp/tools/runR
file_path: plugins/r-statistics/src/mcp/server/lifecycle/createServer.ts
created_at: "2026-06-26T00:00:00Z"
review_branch: feature/r-statistics
original_fix_id: operations-sre-3
severity: MEDIUM
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: prompt-injection-amplification / unrestricted-path-read
metric_value: "dataRefSchema.path: z.string() (no path restriction)"
---

# 기술 부채: dataRefSchema.path unrestricted read — exfil amplification vector
## 원래 수정 요청
Add base-directory/allow-list validation to dataRefSchema.path (reject system paths like /etc/passwd, ~/.ssh) and document the path threat model in DETAIL.md.
## 개발자 소명
Deferred to next sprint per accepted Phase D VETO compromise (PR #76). After FIX-001/FIX-002 close the direct OS-command path, this is a secondary exfil vector; a robust path policy requires a UX design decision (user-declared base dir vs allow-list) that should not expand this PR's release scope.
## 정제된 ADR
Compromise author: business-driver; accepted by operations-sre (Round 2, compromise_accepted: true). Owner: PR author. Timeline: before next-sprint close. Acceptance: path-prefix/allow-list validation on dataRefSchema.path + system-path rejection test + DETAIL.md threat-model note.
