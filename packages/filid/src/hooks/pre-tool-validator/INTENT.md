# pre-tool-validator -- INTENT.md/DETAIL.md 쓰기 차단

## Purpose

Write/Edit 도구가 `INTENT.md` 또는 `DETAIL.md`를 수정하려 할 때 50줄 제한(INTENT.md)과 append-only 방지(DETAIL.md)를 검사해 위반 시 도구 실행을 블록한다. `pre-tool-use` 오케스트레이터가 호출한다.

## Structure

- `pre-tool-validator.ts` — `validatePreToolUse`, `isDetailMd` re-export

## Conventions

- `INTENT_MD_LINE_LIMIT = 50` 모듈 상수
- Edit INTENT.md:
  - 기존 content 읽고 `old_string`을 `new_string`으로 교체해 시뮬레이션
  - projected line count > 50이면 블록
  - 파일 미존재·`old_string` 불일치 시 `new_string` 20줄 초과면 경고만 반환 (블록 X)
- Write INTENT.md: `validateIntentMd` 호출, `error` severity는 블록, `warning`은 continue + 메시지
- Write DETAIL.md: `oldDetailContent`가 제공되면 `validateDetailMd`로 append-only 검사
- 블록 시 메시지 prefix는 `'BLOCKED: '`

## Boundaries

### Always do

- 50줄 제한은 `INTENT_MD_LINE_LIMIT` 상수 경유 (숫자 리터럴 금지)
- `warning`은 continue하되 `additionalContext`로 사용자에게 알림

### Ask first

- 50줄 한계 변경 (FCA 핵심 규칙 — PM 승인 필요)
- Edit 시뮬레이션 실패 시 fallback 정책 변경 (현재는 20줄 경고)

### Never do

- `old_string`을 첫 번째 발견 외 전부 치환 (`String.replace` 1회만)
- 검증 실패를 무시하고 `continue: true` 반환

## Dependencies

- `../../core/rules/document-validator/` (`validateIntentMd`, `validateDetailMd`)
- `../shared/` (`isIntentMd`, `isDetailMd`)
- `../utils/validate-cwd.js`
- `../../types/hooks.js`
- `node:fs`, `node:path`
