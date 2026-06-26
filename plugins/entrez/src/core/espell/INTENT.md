## Purpose

철자 교정 전처리. union이 0/저조하거나 spelling-warning이 뜨면 재시도 여부를 판단(`shouldRespell`)하고, ESpell 교정 결과를 해석(`runEspell`)한다. 네트워크는 주입.

## Structure

| 파일                          | 역할                                                      |
| ----------------------------- | --------------------------------------------------------- |
| `operations/shouldRespell.ts` | `shouldRespell`·`ShouldRespellParams` — 재시도 판단(순수) |
| `operations/runEspell.ts`     | `runEspell`·`EspellFn` — ESpell 교정 해석, espellFn 주입  |
| `index.ts`                    | 배럴                                                      |

## Conventions

- 네트워크는 주입(`EspellFn`) — espell은 순수·테스트 가능. HTTP 클라이언트 import 없음.
- 교정 인정 조건: 비공백 + 원문과 상이. 그 외 `hasCorrection:false`.

## Boundaries

### Always do

- union 0·spelling-warning·threshold 미만 중 하나라도 충족하면 재시도 판단을 true로.
- 교정이 없으면 `corrected`를 undefined로 둔다.

### Ask first

- 재시도 임계값·판단 기준 변경(recall·요청수 영향).

### Never do

- adapters/mcp 직접 import. HTTP 클라이언트 import. 인라인 문자열 리터럴.

## Dependencies

- `../../types/search` — `EspellResult`
