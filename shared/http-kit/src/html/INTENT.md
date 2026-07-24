## Purpose

값을 inline `<script>` 안에 주입해도 안전한 JSON 문자열로 직렬화한다. `JSON.stringify` 만으로는 부족하다 — 페이지 상태 안의 `</script>`·`<`·`>`·`&` 가 스크립트 태그를 탈출하거나, `JSON.stringify` 가 raw 로 남기는 JS 줄 구분자(U+2028/U+2029)가 스크립트 본문을 깨뜨린다.

## Structure

| File                   | Role                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `escapeJsonForHtml.ts` | 맵 기반 단일 정규식 치환 — 클래스와 룩업이 같은 맵에서 파생 |
| `index.ts`             | barrel                                                      |

## Conventions

- 이스케이프 대상과 정규식 문자 클래스를 같은 `ESCAPE_BY_CHARACTERS` 맵에서 파생 — 둘이 어긋날 수 없다.
- 맵 키는 문자 클래스 메타문자(`]-^\`)를 포함하지 않아야 한다.
- 제어문자는 `String.fromCharCode` 로 생성 — 소스에 raw 줄 구분자를 두지 않는다.

## Boundaries

### Always do

- `<`·`>`·`&`·U+2028·U+2029 를 모두 이스케이프.
- 상태 주입 전 반드시 이 함수 경유.

### Ask first

- 이스케이프 문자 집합 변경.

### Never do

- 맵과 별개로 정규식 클래스를 손으로 유지 (drift).
- 소스에 raw U+2028/U+2029 리터럴 배치.

## Dependencies

- 없음 (순수 함수, Node builtin 불요).
