# sessionStart

## Purpose

세션 시작 훅. 호스트 project 지침 초기화, 볼트 검증, 설정 프로비저닝.

## Boundaries

### Always do

- host별 project 후보에서 MAENCOF 소유 섹션만 관리
- 훅 번들 예산을 위해 `instructions/hook` 경량 API만 import하고 범용
  manager·plan·revision·lock 그래프 제외
- 아키텍처 버전 검증 및 마이그레이션 트리거
- companion identity 검증
- metaSkillBody.md 내용을 `hookSpecificOutput.additionalContext` 로 주입 (off-switch 해제 시; 예산 초과 skip 은 error-log 기록)
- L1 core 문서 전체 본문을 `<l1-core-full>` 로 세션 1회 주입 (buildL1CoreBlock; 매 턴은 gist 요약만)
- companion 존재 시 `<personal-context>` 블록을 identity 직후 주입 (readPersonalContext + renderPersonalContextBlock — 캡처 지침 내장, 만료 lazy-filter; 실패 격리)
- sessionStore로 세션 시작 기록 + 직전 세션 요약 surface (`recordSessionStart` / `getRecentSessionSummary`)
- changelog debt 표면화 — `changelog-state.json` 의 pending 이 있으면 1줄 권고 push (차단 없음; 스캔은 MCP bootSweep 의 `changelogDebt` 소관)

### Ask first

- 초기화 순서 변경

### Never do

- MAENCOF 마커 밖 사용자 지침 또는 다른 소유자 섹션 수정
- SessionStart writer의 책임을 신규 자동 작성으로 확장

## Dependencies

- `@ogham/agent-artifacts/instructions/hook`, 목적별 project instruction
  target, 기존 bootstrap 도메인 모듈.
