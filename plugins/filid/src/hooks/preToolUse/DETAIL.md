# preToolUse — Filid 1.0 Contract

## Requirements

- 완전한 `apply_patch`의 모든 논리 Write/Edit/Delete operation을 입력 순서대로 기존 per-operation 파이프라인에 보낸다.
- 각 operation은 방문 전달을 먼저 실행하고, 방문 deny 시 그 operation의 문서 검증과 구조 가드를 중단한다.
- batch loop는 앞선 deny에도 모든 후속 operation을 실행하며, 하나라도 deny면 전체 물리 호출을 deny한다.
- Write/Edit/Delete는 방문 통과 후 문서 gate를 거치고 Write/Edit은 이어서 구조 가드를 실행한다.
- Delete도 owner 방문 상태를 갱신하며 host가 INTENT.md/DETAIL.md와 같은 파일로 해석하는 대상 삭제는 명시적 사유로 deny한다.
- `apply_patch` 파싱이 불완전하면 유효 prefix도 실행하지 않고 FCA 프로젝트에서는 parser reason과 유효한 V4A 재발행 안내로 deny하며, 비-FCA 프로젝트에서는 bare allow한다.
- branch 이름, spike 상태, criteria ledger 또는 agent 역할에 따라 검증을 면제하지 않는다.
- 비-FCA 프로젝트와 유효하지 않은 cwd는 상태를 변경하지 않고 통과시킨다.

## API Contracts

- `handlePreToolUse(input): Promise<HookOutput>` — 한 operation의 방문, 문서 검증, 구조 가드를 staged pipeline으로 실행한다.
- `handlePreToolUseBatch(result): Promise<HookOutput>` — shared normalizer의 성공 batch는 전부 순서대로 실행하고 실패 variant는 원래 cwd의 FCA opt-in에 따라 결정한다.
- INTENT.md/DETAIL.md의 기존 내용이 필요한 검증은 현재 host filesystem에서 best-effort로 읽는다.
- 방문 deny가 발생하면 validator와 structure guard를 실행하지 않고 해당 deny를 반환한다.
- batch 결과의 reason과 non-empty additional context는 operation 순서로 결합하며 permission은 deny-wins다.

## Acceptance Criteria

### AC-pre-tool-order — 전달 우선 실행

- 모든 Read/Write/Edit/Delete 방문은 동일한 `processVisit(input)` 계약을 사용한다.
- 최초 mutation deny 후 같은 요청을 재시도하면 문서 검증과 구조 가드까지 진행한다.
- 한 operation의 방문 deny는 이후 stage만 short-circuit하고 다음 batch operation은 실행을 계속한다.

### AC-pre-tool-batch — ordered deny-wins 집계

- 첫 operation이 허용되어도 후속 operation의 validator deny 또는 structure warning이 정확한 경로와 함께 최종 결과에 남는다.
- 어느 operation이든 deny하면 전체 `apply_patch`가 deny되고, 모든 operation의 결과 순서는 입력 순서를 따른다.
- Move의 source `Delete`와 destination `Write`도 같은 deny-wins 집계를 거쳐 일반 경로는 허용하고 보호 문서 source rename은 거부한다.

### AC-pre-tool-document-gate — 일관된 문서 계약

- spike 이름의 branch에서도 50줄 초과 INTENT.md와 append-only DETAIL.md는 동일하게 deny된다.
- host-canonical parent 아래의 INTENT.md 또는 DETAIL.md terminal entry를 Delete하는 operation은 보호 문서 삭제 사유로 deny된다.
- legacy criteria ledger는 일반 파일처럼 통과하며 hook 전용 deny나 audit을 만들지 않는다.

### AC-pre-tool-malformed — 보수적 파싱 실패

- command 결손이나 malformed/unsupported section이 있는 `apply_patch`는 FCA 프로젝트에서 parser reason과 V4A 재발행 안내를 포함해 deny되며 retry 안내를 중복하지 않는다.
- 같은 파싱 실패는 비-FCA 프로젝트에서 context나 permission envelope 없이 허용된다.

## Boundary Exemptions

### preToolUse.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

2026-08-23 — ordered apply_patch·Move 집계, terminal-entry Delete 문서 보호, 실행 가능한 파싱 실패 안내를 계약화했다.
