# bootstrap — Contract

## Requirements

- 호스트 project 지침에서 MAENCOF 소유 섹션만 관리한다. 마커 밖 사용자 지침이나 다른 소유자 섹션은 건드리지 않는다.
- project instruction target은 `hostConfigurationSurfaces`가 교차 검증하는 `@ogham/agent-artifacts` 결과와 같아야 한다. Codex에서는 AGENTS owned section, Claude에서는 기존 CLAUDE.md 후보를 유지한다.
- `@ogham/agent-artifacts` package root에서 `applyHookInstructionSection`·`inspectHookInstructionSection`·`resolveProjectInstructionTarget`만 named import한다. 범용 manager·plan·revision·lock export는 `sideEffects: false` tree-shaking으로 제거되고, emitted-byte cap과 `FORBIDDEN_PATTERNS`가 실제 출력을 검증한다.
- 주입은 세션 1회 기준이다: meta-skill 본문, L1 core 전체 본문(`<l1-core-full>`), companion identity 직후의 `<personal-context>` 블록. 매 턴 주입은 gist 만이며 그것은 `contextInjector` 소관이다.
- 각 관심사는 실패를 격리한다. 예산 초과로 meta-skill 을 건너뛰면 error-log 에 남긴다.
- SessionStart writer 의 책임을 신규 자동 작성으로 넓히지 않는다.

## API Contracts

세션 한 번의 전체 identity·L1·meta-skill 주입과 매 턴 gist 주입의 책임을 혼합하지 않는다. meta-skill 본문은 이 모듈 소유 자산이며 예산 초과로 생략할 때에는 로그를 남긴다.

## Acceptance Criteria

### AC-insight-policy-delivery — Insight lifecycle delivery

- New-version initialization replaces only the owned project section with capture, consolidation and recall routing. Same-version initialization preserves the current owned section.
- Active sessions receive the dialogue routing within the existing character budget; dialogue-disabled sessions omit it. Capture-disabled sessions omit the auto-insight meta-prompt.
- Generated bridge verification and a model following the skill are distinct evidence: a subprocess output proves policy delivery, not conversational compliance.

### AC-source-locations — Session citation discipline

- Active maencof sessions receive a concise original-source-and-location rule within the existing meta-skill budget. Dialogue off-switch and non-vault sessions omit it.
- Version-triggered project directive updates carry document maintenance rules while preserving all text outside owned markers.

## Boundary Exemptions

### `bootstrap.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. SessionStart orchestrator 가 이 파일을 직접 가져오는 것은 `sessionStart/INTENT.md` 가 선언한 형태이고, 같은 번들이 L1 전체 본문과 meta-skill 본문까지 실어야 하므로 배럴 경유가 57344 바이트 캡을 잠식한다.

## Last Updated

호스트 지침의 소유 섹션, 세션 1회 주입 범위 또는 정책 전달 예산이 바뀔 때 갱신한다.
