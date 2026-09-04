# preToolValidator — Filid 1.0 Contract

## Requirements

- Write/Edit가 INTENT.md 또는 DETAIL.md를 변경할 때 문서 계약을 검증하고, Delete가 두 보호 문서를 제거하려 하면 deny한다.
- Write/Edit의 문서 여부는 host filesystem이 해석한 물리 target으로 판정한다. 실제 보호 문서를 가리키는 case alias와 symlink는 동일하게 검증하며, case-sensitive filesystem의 별개 파일은 보호 문서로 추측하지 않는다.
- INTENT.md Write는 50줄 cap과 3-tier boundary를, Edit은 최종 투영 가능한 경우 50줄 cap을 검사한다.
- DETAIL.md Write는 기존 내용이 있을 때 append-only 변경을 거부한다.
- INTENT.md/DETAIL.md Delete는 content 투영 없이 거부한다. host-canonical parent와 보존된 terminal entry로 판정해 case alias와 보호 문서 symlink 삭제 우회를 막고, 존재하지 않는 대상도 같은 entry 의미로 판정한다.
- branch, spike 상태, criteria ledger 또는 agent 역할을 입력으로 받거나 면제 근거로 사용하지 않는다.

## API Contracts

- `validatePreToolUse(input, oldContent?): HookOutput` — 문서 대상이 아니면 통과하고 위반 시 현재 도구 호출만 deny한다.
- `projectMoveContent(move, safeCwd): MoveProjectionResult` — source 부재는 `missing-source`, bodyless Move는 source 전체 `exact`, hunk Move는 shared 순수 투영의 `exact`·`stale-source`·`ambiguous`와 0-based hunk index를 반환한다.
- Delete 입력은 host가 canonicalize한 기존 대상 또는 원래 입력 경로가 INTENT.md/DETAIL.md인지 판정하며 Write/Edit용 content 검증을 실행하지 않는다.
- Write/Edit는 마지막 symlink도 따라가며, Edit의 현재 내용 읽기는 그 물리 target을 사용한다. Delete는 마지막 symlink entry를 보존하므로 일반 이름의 링크만 제거하는 작업을 referent 문서 삭제로 간주하지 않는다.
- Edit의 `replace_all`이 true면 모든 정확 일치 문자열을, 그 외에는 첫 일치만 투영한다.
- 투영할 수 없는 INTENT.md Edit이 20줄을 넘으면 차단하지 않고 명시적 경고를 제공한다.

## Acceptance Criteria

### AC-validator-intent — INTENT write gate

- 빈 content를 포함한 INTENT.md Write는 검증을 우회하지 않는다.
- 50줄 초과 Write/Edit은 branch 이름과 무관하게 deny된다.
- 기존 INTENT.md의 case alias 또는 symlink alias를 통한 Write/Edit도 같은 50줄 cap을 적용한다. 이름만 INTENT.md인 symlink가 일반 파일을 가리키면 Write/Edit 문서 gate를 적용하지 않는다.
- dangling symlink의 Write는 생성될 referent의 물리 target으로 판정하므로 새 INTENT.md의 50줄 cap을 우회하지 않으며, 새 일반 파일을 보호 문서로 오인하지 않는다.

### AC-validator-detail — DETAIL append-only gate

- 기존 DETAIL.md 뒤에 내용만 붙인 Write는 deny되고 현재 계약을 재구성한 Write는 통과한다.
- 기존 DETAIL.md의 case alias 또는 symlink alias를 통한 Write도 이전 내용이 제공되면 append-only 변경을 거부한다.
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
- **Reason**: source read와 순수 hunk projection을 문서 Edit 검증의 I/O 경계와 함께 소유하고, 상위 orchestrator에는 exact content 또는 실패 종류와 hunk index만 entry point로 제공한다.

## Last Updated

2026-09-05 — Write/Edit 물리 target 판정과 Delete terminal-entry 판정을 구분했다.
