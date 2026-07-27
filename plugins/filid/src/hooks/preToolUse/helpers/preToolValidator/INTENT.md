# preToolValidator -- 문서 계약 쓰기 차단

## Purpose

Write/Edit가 INTENT.md(50줄 제한·3-tier) 또는 DETAIL.md(append-only 방지)를 수정할 때 위반한 도구 호출만 deny한다. branch mode나 criteria ledger는 입력으로 받지 않는다.

## Structure

- `preToolValidator.ts` — `validatePreToolUse`
- `utils/` organ — INTENT/DETAIL 투영과 결과 조립
- `DETAIL.md` — 공개 write-gate 계약

## Conventions

- `INTENT_MD_LINE_LIMIT`은 `constants/documentValidation.js`에서 import (모듈 재선언 금지 — 단일 원천)
- INTENT.md — Write: `validateIntentMd` (`error` 블록, `warning` continue + 메시지). Edit: `old_string`→`new_string` 교체 시뮬레이션 후 projected > 50줄이면 블록; 시뮬레이션 불가 시 `new_string` 20줄 초과만 경고
- DETAIL.md — Write: `oldContent` 제공 시 `validateDetailMd` append-only 검사
- 차단 시 `permissionDecision: 'deny'` + `permissionDecisionReason`에 사유 설정

## Boundaries

### Always do

- 50줄 제한은 `INTENT_MD_LINE_LIMIT` import 경유 (숫자 리터럴·지역 재선언 금지)
- `warning`은 continue하되 `additionalContext`로 사용자에게 알림
- 빈 INTENT.md Write도 전체 문서 검증

### Ask first

- 50줄 한계 변경 (FCA 핵심 규칙 — PM 승인 필요)
- Edit 시뮬레이션 실패 시 fallback 정책 변경 (현재는 20줄 경고)
- INTENT.md/DETAIL.md 외 hook 전용 문서 gate 추가

### Never do

- `replace_all` 플래그 무시 — `true`면 전체 치환, 기본은 1회 치환 (`projectEdit` 규칙)
- 검증 실패 시 `deny` 누락 금지
- branch mode나 agent 역할을 검증 면제 근거로 사용

## Dependencies

- `../../core/rules/documentValidator/` (`validateIntentMd`, `validateDetailMd`)
- `../shared/` (`isIntentMd`, `isDetailMd`), `../utils/validateCwd.js`
- `../../constants/hookDefaults.js` (`DENY_RETRY_GUIDANCE`), `../../constants/documentValidation.js` (`INTENT_MD_LINE_LIMIT`)
- `../../types/hooks.js`, `node:fs`, `node:path`
