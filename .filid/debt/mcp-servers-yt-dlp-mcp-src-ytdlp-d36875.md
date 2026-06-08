---
id: mcp-servers-yt-dlp-mcp-src-ytdlp-d36875
fractal_path: mcp-servers/yt-dlp-mcp/src/ytdlp
file_path: mcp-servers/yt-dlp-mcp/src/ytdlp/binary/ensure-binary.ts
created_at: "2026-06-08T08:15:00Z"
review_branch: feature/yt-dlp-mcp
original_fix_id: FIX-001
severity: MEDIUM
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: cyclomatic-complexity
metric_value: CC=16
---

# 기술 부채: createBinaryManager CC=16 — accept-as-is (borderline +1)
## 원래 수정 요청
createBinaryManager CC=16 exceeds threshold 15 by 1; 7 nested closure helpers (fileExists/readMeta/isFresh/acquireLock/releaseLock/verifyChecksum/acquireAndInstall) summed.
## 개발자 소명
위원회 6/6 SYNTHESIS 의도적 수용. 경계선 +1, 각 헬퍼 개별 단순, DI 팩토리 패턴의 합리적 결과. 모듈 최상위 추출 시 deps 매개변수 통과로 API surface 확대.
## 정제된 ADR
ADR-2026-06-08: createBinaryManager CC accept-as-is. Context: CC=16 vs threshold 15, 7 closure helpers summed. Decision: retain factory DI pattern, defer extraction. Consequences: +1 borderline CC tracked; extract helpers to binary/ organ files when they grow.
