# preToolValidator -- 문서 계약 쓰기 차단

## Purpose

Write/Edit가 `INTENT.md`(50줄 제한)·`DETAIL.md`(append-only 방지)·`.filid/criteria.md`(원장 lint)를 수정할 때 위반 시 해당 도구 호출만 `deny` (턴 비중단). `preToolUse` 오케스트레이터가 호출한다.

## Structure

- `preToolValidator.ts` — `validatePreToolUse`

## Conventions

- `INTENT_MD_LINE_LIMIT = 50` 모듈 상수
- Edit INTENT.md: 기존 content에 `old_string`→`new_string` 교체 시뮬레이션, projected > 50줄이면 블록; 시뮬레이션 불가 시 `new_string` 20줄 초과면 경고만
- Write INTENT.md: `validateIntentMd` — `error`는 블록, `warning`은 continue + 메시지
- Write DETAIL.md: `oldContent` 제공 시 `validateDetailMd` append-only 검사
- criteria.md: Write/Edit 모두 `validateCriteriaMd` (Edit은 시뮬레이션) — claim 삭제·필수 필드 누락·status enum·중복 id·동어반복 차단
- `spikeExempt=true`(spike/\* 브랜치 + INTENT/DETAIL 대상, 오케스트레이터가 판정)면 문서 위생 deny 면제; criteria.md는 어떤 모드에서도 면제 불가
- 차단 시 `permissionDecision: 'deny'` + `permissionDecisionReason`에 사유 설정

## Boundaries

### Always do

- 50줄 제한은 `INTENT_MD_LINE_LIMIT` 상수 경유 (숫자 리터럴 금지)
- `warning`은 continue하되 `additionalContext`로 사용자에게 알림
- criteria 검사는 spike 면제 게이트보다 먼저 실행

### Ask first

- 50줄 한계 변경 (FCA 핵심 규칙 — PM 승인 필요)
- Edit 시뮬레이션 실패 시 fallback 정책 변경 (현재는 20줄 경고)
- spike 면제 범위 확장 (현재 INTENT/DETAIL 위생 deny 한정)

### Never do

- `old_string`을 첫 번째 발견 외 전부 치환 (`String.replace` 1회만)
- 검증 실패 시 `deny` 누락 금지
- criteria.md 검증을 spike 모드에서 건너뛰기

## Dependencies

- `../../core/rules/documentValidator/` (`validateIntentMd`, `validateDetailMd`, `validateCriteriaMd`)
- `../shared/` (`isIntentMd`, `isDetailMd`, `isCriteriaMd`)
- `../utils/validateCwd.js`
- `../../types/hooks.js`, `../../types/documents.js`
- `../../constants/hookDefaults.js` (`DENY_RETRY_GUIDANCE`)
- `node:fs`, `node:path`
