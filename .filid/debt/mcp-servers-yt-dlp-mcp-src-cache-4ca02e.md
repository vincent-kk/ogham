---
id: mcp-servers-yt-dlp-mcp-src-cache-4ca02e
fractal_path: mcp-servers/yt-dlp-mcp/src/cache
file_path: mcp-servers/yt-dlp-mcp/src/cache/cache.ts
created_at: "2026-06-08T08:15:00Z"
review_branch: feature/yt-dlp-mcp
original_fix_id: FIX-002
severity: LOW
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: lcom4
metric_value: LCOM4=3
---

# 기술 부채: TtlLruCache LCOM4=3 — false-positive
## 원래 수정 요청
TtlLruCache LCOM4=3; components [constructor],[get,set,clear,size],[has].
## 개발자 소명
정적 분석기가 TS parameter-property 초기화 + has()→get() 위임을 필드 그래프에 연결 못한 false-positive. 53행 단일 책임 캐시로 분리 근거 없음.
## 정제된 ADR
ADR-2026-06-08: TtlLruCache LCOM4 false-positive. Context: analyzer misses parameter-property init + has()->get() delegation. Decision: no split, single-responsibility 53-line cache. Consequences: false-positive tracked; revisit if analyzer gains delegation awareness.
