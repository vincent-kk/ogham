# preToolValidator -- 문서 계약 쓰기 차단

## Purpose

Write/Edit가 INTENT.md 또는 DETAIL.md를 수정할 때 현재 문서 계약을 검증하고, Delete는 INTENT.md의 프랙탈 경계를 보호하고 DETAIL.md에는 삭제 조건을 안내한다. branch mode나 criteria ledger는 입력으로 받지 않는다.

## Conventions

- INTENT line limit은 canonical validation constant에서 import한다 (모듈 재선언 금지 — 단일 원천).
- Write/Edit는 host filesystem의 물리 target으로 문서 여부를 판정하고 마지막 symlink도 따라간다.
- INTENT.md — Write: `validateIntentMd` (`error` 블록, `warning` continue + 메시지). Edit: `old_string`→`new_string` 교체 시뮬레이션 후 projected > 50줄이면 블록; 시뮬레이션 불가 시 `new_string` 20줄 초과만 경고
- DETAIL.md — Write: 빈 내용과 첫 쓰기도 전체 검증하며 `oldContent`가 있으면 append-only 검사
- Delete — parent는 host filesystem 기준으로 canonicalize하되 terminal entry를 보존하고, 그 basename이 INTENT.md이면 content 투영 없이 강등 조건 확인
- 차단 시 `permissionDecision: 'deny'` + `permissionDecisionReason`에 사유 설정

## Boundaries

### Always do

- 50줄 제한은 `INTENT_MD_LINE_LIMIT` import 경유 (숫자 리터럴·지역 재선언 금지)
- INTENT.md Delete는 case alias와 terminal symlink entry까지 동일한 강등 조건으로 보호
- `warning`은 continue하되 `additionalContext`로 사용자에게 알림
- 빈 INTENT.md와 DETAIL.md Write도 전체 문서 검증

### Ask first

- 50줄 한계 변경 (FCA 핵심 규칙 — PM 승인 필요)
- Edit 시뮬레이션 실패 시 fallback 정책 변경 (현재는 20줄 경고)
- 보호 문서 Delete 정책, canonical target 판정 또는 deny reason 변경
- INTENT.md/DETAIL.md 외 hook 전용 문서 gate 추가

### Never do

- `replace_all` 플래그 무시 — `true`면 전체 치환, 기본은 1회 치환 (`projectEdit` 규칙)
- 검증 실패 시 `deny` 누락 금지
- 존재하지 않는 case variant를 보호 문서로 추측하거나 Delete를 빈 Write/Edit로 합성
- branch mode나 agent 역할을 검증 면제 근거로 사용
