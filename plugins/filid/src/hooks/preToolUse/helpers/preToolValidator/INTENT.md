# preToolValidator -- 문서 계약 쓰기 차단

## Purpose

Write/Edit가 INTENT.md 또는 DETAIL.md를 수정할 때 현재 문서 계약을 검증하고, Delete는 INTENT.md의 프랙탈 경계를 보호하고 DETAIL.md에는 삭제 조건을 안내한다. branch mode나 criteria ledger는 입력으로 받지 않는다.

## Conventions

- INTENT cap은 canonical 상수 하나를 사용한다. 지역 숫자가 갈라지면 Write와 Edit의 문서 계약이 달라진다.
- Write/Edit는 symlink를 따라 실제 보호 문서를 판정하고 Delete는 마지막 entry를 보존한다. 링크 이름과 referent 삭제를 혼동하지 않기 위해서다.
- Write는 전체 문서를 검사하지만 Edit는 투영 가능한 INTENT 줄 수만 본다. DETAIL Edit와 투영 불가 Edit에는 전체 계약 검증을 주장하지 않는다.
- warning은 안내로 남기고 error만 해당 도구 호출을 deny한다. 빈 첫 Write도 문서 계약을 우회하지 않는다.

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
