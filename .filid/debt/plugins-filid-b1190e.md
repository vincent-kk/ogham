---
id: plugins-filid-b1190e
fractal_path: plugins/filid
file_path: plugins/filid/bridge/mcp-server.cjs
created_at: "2026-07-07T14:41:00Z"
review_branch: ref/filid-maencof
original_fix_id: FIX-013
severity: MEDIUM
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: doc-runtime-contract-mismatch
metric_value: bridge/ == main (filid·maencof·maencof-lens 3개 패키지), fractal_scan raw payload 485,679자 재현
---

# 기술 부채: bridge 산출물 재빌드 + 사용자 커밋 — 머지 전 사람 액션 게이트
## 원래 수정 요청
머지 전 3개 패키지 재빌드(yarn build:all 또는 패키지별 build:plugin) 후 사용자가 직접 bridge/ 산출물 커밋 — 소스 수정(buildScanResult.ts size-guard 등)이 커밋된 런타임 산출물에 미반영
## 개발자 소명
AI는 bridge/ 빌드 산출물을 커밋하지 않는 레포 컨벤션 — 재빌드와 커밋은 사용자가 직접 수행해야 하므로 resolve --auto가 자동 적용할 수 없는 사람 액션 항목. 리뷰 자체(operations-sre·business-driver)도 '머지 체크리스트로 처리'를 권고함.
## 정제된 ADR
ADR-2026-07-07: bridge 재빌드를 머지 게이트(사람 액션)로 이관. Context: FIX-013 doc-runtime-contract-mismatch — fractalScan outputMode/size-guard, intentInjector recordWriteVisit, deny envelope 등 소스 변경이 3개 패키지 bridge/에 미반영, structure-check.md가 485,679자 raw payload 토큰 에러를 실측 재현. Decision: 자동 적용에서 제외하고 사용자가 머지 전 yarn build:all 실행 후 bridge/ 산출물을 직접 커밋한다. Consequences: 재빌드 전까지 fractal_scan size-guard 계약 미보장 — PR 머지 체크리스트 및 본 debt 레코드로 추적, bridge 커밋 시 해소.
