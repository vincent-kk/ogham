# preToolValidator — Filid 1.0 Contract

## Requirements

- Write/Edit가 INTENT.md 또는 DETAIL.md를 변경할 때 문서 계약을 검증한다.
- INTENT.md Write는 50줄 cap과 3-tier boundary를, Edit은 최종 투영 가능한 경우 50줄 cap을 검사한다.
- DETAIL.md Write는 기존 내용이 있을 때 append-only 변경을 거부한다.
- branch, spike 상태, criteria ledger 또는 agent 역할을 입력으로 받거나 면제 근거로 사용하지 않는다.

## API Contracts

- `validatePreToolUse(input, oldContent?): HookOutput` — 문서 대상이 아니면 통과하고 위반 시 현재 도구 호출만 deny한다.
- Edit의 `replace_all`이 true면 모든 정확 일치 문자열을, 그 외에는 첫 일치만 투영한다.
- 투영할 수 없는 INTENT.md Edit이 20줄을 넘으면 차단하지 않고 명시적 경고를 제공한다.

## Acceptance Criteria

### AC-validator-intent — INTENT write gate

- 빈 content를 포함한 INTENT.md Write는 검증을 우회하지 않는다.
- 50줄 초과 Write/Edit은 branch 이름과 무관하게 deny된다.

### AC-validator-detail — DETAIL append-only gate

- 기존 DETAIL.md 뒤에 내용만 붙인 Write는 deny되고 현재 계약을 재구성한 Write는 통과한다.
- `.filid/criteria.md` Write/Edit은 별도 처리나 진단 없이 통과한다.

## Boundary Exemptions

### preToolValidator.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-07-27 — spike 면제와 criteria ledger validator를 제거한 1.0 계약으로 재구성했다.
