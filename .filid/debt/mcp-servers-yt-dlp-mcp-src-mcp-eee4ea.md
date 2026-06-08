---
id: mcp-servers-yt-dlp-mcp-src-mcp-eee4ea
fractal_path: mcp-servers/yt-dlp-mcp/src/mcp
file_path: mcp-servers/yt-dlp-mcp/src/mcp/registry/registry.ts
created_at: "2026-06-08T08:15:00Z"
review_branch: feature/yt-dlp-mcp
original_fix_id: FIX-006
severity: MEDIUM
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: tool-toggle-granularity
metric_value: 1 toggle registers 2 tools
---

# 기술 부채: YTDLP_ENABLE_COMMENTS dual-tool toggle — accept-as-is
## 원래 수정 요청
YTDLP_ENABLE_COMMENTS=1 registers both ytdlp_get_comments and ytdlp_get_comments_summary; cannot enable summary-only.
## 개발자 소명
위원회 현행 동작 수용 범위 권고. 동작 변경 위험 회피. 향후 분리 수요 시 YTDLP_ENABLE_COMMENTS_SUMMARY 별도 토글 검토.
## 정제된 ADR
ADR-2026-06-08: comments toggle granularity accept-as-is. Context: single YTDLP_ENABLE_COMMENTS registers 2 tools. Decision: retain current coarse toggle. Consequences: no summary-only mode; revisit on user demand with a dedicated flag.
