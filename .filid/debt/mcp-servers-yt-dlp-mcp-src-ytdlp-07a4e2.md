---
id: mcp-servers-yt-dlp-mcp-src-ytdlp-07a4e2
fractal_path: mcp-servers/yt-dlp-mcp/src/ytdlp
file_path: mcp-servers/yt-dlp-mcp/src/ytdlp/binary/version.ts
created_at: "2026-06-08T08:15:00Z"
review_branch: feature/yt-dlp-mcp
original_fix_id: FIX-005
severity: LOW
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: observability
metric_value: no logger in scope
---

# 기술 부채: pickAsset failure logging deferred — out of surgical scope
## 원래 수정 요청
pickAsset failure (assets undefined/empty) propagates as BINARY_UNAVAILABLE with no log; add logger.warn recording the failing tag_name.
## 개발자 소명
createVersionResolver의 VersionResolverDeps에 logger 필드 없음. logger 주입은 createBinaryManager 등 합성 지점의 연쇄 변경을 요구 → 단일 파일(version.ts) 수술 범위 초과로 보류.
## 정제된 ADR
ADR-2026-06-08: pickAsset logging deferred. Context: no logger in VersionResolverDeps scope. Decision: defer to follow-up adding logger?: Logger to deps + wiring at createBinaryManager. Consequences: GitHub API format-change detection blind until logger threaded in.
