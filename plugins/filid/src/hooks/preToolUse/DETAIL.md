# preToolUse — Filid 1.0 Contract

## Requirements

- FCA 프로젝트의 Read, Write, Edit 이벤트를 방문 전달 파이프라인에 먼저 보낸다.
- 방문 파이프라인의 deny는 INTENT 규칙을 함께 전달하고 현재 mutation만 중단한다.
- Write/Edit은 방문 통과 후 INTENT.md/DETAIL.md 검증과 구조 가드를 순서대로 실행한다.
- branch 이름, spike 상태, criteria ledger 또는 agent 역할에 따라 검증을 면제하지 않는다.
- 비-FCA 프로젝트와 유효하지 않은 cwd는 상태를 변경하지 않고 통과시킨다.

## API Contracts

- `handlePreToolUse(input): Promise<HookOutput>` — 방문, 문서 검증, 구조 가드 결과를 하나의 PreToolUse 출력으로 병합한다.
- INTENT.md/DETAIL.md의 기존 내용이 필요한 검증은 현재 host filesystem에서 best-effort로 읽는다.
- 방문 deny가 발생하면 validator와 structure guard를 실행하지 않고 해당 deny를 반환한다.

## Acceptance Criteria

### AC-pre-tool-order — 전달 우선 실행

- 모든 Read/Write/Edit 방문은 동일한 `processVisit(input)` 계약을 사용한다.
- 최초 mutation deny 후 같은 요청을 재시도하면 문서 검증과 구조 가드까지 진행한다.

### AC-pre-tool-document-gate — 일관된 문서 계약

- spike 이름의 branch에서도 50줄 초과 INTENT.md와 append-only DETAIL.md는 동일하게 deny된다.
- `.filid/criteria.md`는 일반 파일처럼 통과하며 hook 전용 deny나 audit을 만들지 않는다.

## Last Updated

2026-07-27 — criteria/spike/mode-audit 분기를 제거한 1.0 runtime 계약으로 재구성했다.
