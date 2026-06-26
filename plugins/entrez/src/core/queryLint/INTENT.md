## Purpose

검색식 **사전 검증**. 괄호 `()`·대괄호 `[]` 짝/중첩 오류(error)와 PubMed ATM·MeSH explosion을 무력화하는 패턴(따옴표 구문·wildcard `*`)을 경고(warning)로 보고. 순수 함수, 네트워크 없음.

## Structure

| 파일                           | 역할                                                      |
| ------------------------------ | --------------------------------------------------------- |
| `operations/checkParens.ts`    | `checkParens` — 스택 기반 괄호/대괄호 짝·중첩 검증(error) |
| `operations/checkFieldTags.ts` | `checkFieldTags` — 따옴표 구문·wildcard recall 저하 경고  |
| `operations/lintQuery.ts`      | `lintQuery` — 두 검사 통합·`ok` 산정(메인)                |

## Conventions

- 순수 함수(네트워크·I/O·상태 없음).
- 코드·메시지는 로컬 `as const` 객체로만 정의(인라인 리터럴 금지).
- `ok = issues.every(severity !== "error")`.

## Boundaries

### Always do

- 닫는 기호는 가장 최근 여는 기호 타입과 일치해야 한다(스택 검증).
- 괄호 vs 대괄호 문제는 구분된 코드로 보고.

### Ask first

- 새 lint 규칙 추가·심각도(error/warning) 변경.

### Never do

- 상위 레이어 import. 네트워크·LLM 호출. 인라인 문자열 리터럴.

## Dependencies

- `../../types/search` — `LintIssue`, `LintResult`
