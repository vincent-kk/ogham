# preToolValidator — Filid 1.0 Contract

## Requirements

- Write/Edit가 INTENT.md 또는 DETAIL.md를 변경할 때 문서 계약을 검증하고, Delete가 두 보호 문서를 제거하려 하면 deny한다.
- INTENT.md Write는 50줄 cap과 3-tier boundary를, Edit은 최종 투영 가능한 경우 50줄 cap을 검사한다.
- DETAIL.md Write는 기존 내용이 있을 때 append-only 변경을 거부한다.
- INTENT.md/DETAIL.md Delete는 content 투영 없이 거부한다. host-canonical parent와 보존된 terminal entry로 판정해 case alias와 보호 문서 symlink 삭제 우회를 막고, 존재하지 않는 대상도 같은 entry 의미로 판정한다.
- branch, spike 상태, criteria ledger 또는 agent 역할을 입력으로 받거나 면제 근거로 사용하지 않는다.

## API Contracts

- `validatePreToolUse(input, oldContent?): HookOutput` — 문서 대상이 아니면 통과하고 위반 시 현재 도구 호출만 deny한다.
- `projectMoveContent(move, safeCwd): string | undefined` — source를 읽어 완전한 Move destination을 투영하며 유일한 연속 replacement를 증명할 수 없으면 `undefined`를 반환한다.
- Delete 입력은 host가 canonicalize한 기존 대상 또는 원래 입력 경로가 INTENT.md/DETAIL.md인지 판정하며 Write/Edit용 content 검증을 실행하지 않는다.
- Edit의 `replace_all`이 true면 모든 정확 일치 문자열을, 그 외에는 첫 일치만 투영한다.
- 투영할 수 없는 INTENT.md Edit이 20줄을 넘으면 차단하지 않고 명시적 경고를 제공한다.

## Acceptance Criteria

### AC-validator-intent — INTENT write gate

- 빈 content를 포함한 INTENT.md Write는 검증을 우회하지 않는다.
- 50줄 초과 Write/Edit은 branch 이름과 무관하게 deny된다.

### AC-validator-detail — DETAIL append-only gate

- 기존 DETAIL.md 뒤에 내용만 붙인 Write는 deny되고 현재 계약을 재구성한 Write는 통과한다.
- legacy criteria ledger의 Write/Edit/Delete는 별도 처리나 진단 없이 통과한다.

### AC-validator-delete — 보호 문서 삭제 gate

- INTENT.md와 DETAIL.md Delete는 각각 명시적 보호 문서 삭제 reason과 함께 deny된다.
- host가 `intent.md` 또는 `detail.md`를 기존 보호 문서와 같은 대상으로 해석하면 해당 case alias Delete도 deny된다.
- terminal symlink의 basename이 INTENT.md 또는 DETAIL.md이면 referent 이름과 무관하게 Delete가 deny된다.
- 일반 파일 Delete는 문서 validator가 별도 처리하지 않는다.

## Boundary Exemptions

### preToolValidator.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

### `utils/projectMoveContent.ts` — Move destination projection

- **Consumers**: `entry-point`
- **Direct import**: `not allowed`
- **Reason**: source projection I/O를 문서 Edit 검증과 함께 소유해 경로 해석을 중복하지 않으며, 상위 orchestrator에는 완전한 destination content만 entry point로 제공한다.

## Last Updated

2026-08-24 — Move destination projection을 명시적 entry-point contract로 제한했다.
