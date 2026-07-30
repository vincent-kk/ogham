# bootstrap — Contract

## Requirements

- 호스트 project 지침에서 MAENCOF 소유 섹션만 관리한다. 마커 밖 사용자 지침이나 다른 소유자 섹션은 건드리지 않는다.
- `@ogham/agent-artifacts` package root에서 `applyHookInstructionSection`·`inspectHookInstructionSection`·`resolveProjectInstructionTarget`만 named import한다. 범용 manager·plan·revision·lock export는 `sideEffects: false` tree-shaking으로 제거되고, emitted-byte cap과 `FORBIDDEN_PATTERNS`가 실제 출력을 검증한다.
- 주입은 세션 1회 기준이다: meta-skill 본문, L1 core 전체 본문(`<l1-core-full>`), companion identity 직후의 `<personal-context>` 블록. 매 턴 주입은 gist 만이며 그것은 `contextInjector` 소관이다.
- 각 관심사는 실패를 격리한다. 예산 초과로 meta-skill 을 건너뛰면 error-log 에 남긴다.
- SessionStart writer 의 책임을 신규 자동 작성으로 넓히지 않는다.

## API Contracts

- `runSessionStart(input)` — `SessionStartResult`. 지침 초기화·볼트 검증·설정 프로비저닝·주입 블록 조립·세션 기록·changelog debt 권고를 한 번에 수행한다.
- 입력 `SessionStartInput`, 출력 `SessionStartResult`(`hookSpecificOutput.additionalContext` 포함).
- `metaSkillBody.md` 는 이 fractal 이 소유하는 주입 본문 자산이다.

## Acceptance Criteria

### AC-marker-scoped-write — 마커 범위 쓰기

- 지침 파일에서 MAENCOF 마커 밖 내용이 변경되지 않는다.

### AC-session-once-injection — 세션 1회 주입

- L1 전체 본문과 meta-skill 본문이 세션당 한 번만 실린다.

### AC-concern-failure-isolated — 실패 격리

- 한 관심사가 실패해도 나머지 주입과 세션 기록이 진행된다.

## Boundary Exemptions

### `bootstrap.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. SessionStart orchestrator 가 이 파일을 직접 가져오는 것은 `sessionStart/INTENT.md` 가 선언한 형태이고, 같은 번들이 L1 전체 본문과 meta-skill 본문까지 실어야 하므로 배럴 경유가 57344 바이트 캡을 잠식한다.

## Last Updated

2026-07-30 — 마커 범위·세션 1회 주입 계약과 훅 직접 import 면책을 유지하며 공유 패키지 root import를 현행화했다.
