## Purpose

규칙 문서의 상태를 검사하고 원하는 집합으로의 변경을 계획·적용하며, Claude 소유 파일과 Codex 소유 마커 구간에 같은 논리 결과를 낸다.

## Structure

| Path        | Role                                       |
| ----------- | ------------------------------------------ |
| `index.ts`  | 내부 호환 barrel·패키지 루트 재노출 source |
| `rules.ts`  | target별 manager 조립                      |
| `planning/` | 공통 사실표 판정과 변경 계획               |
| `status/`   | 전체 상태와 단일 문서 presence 판독        |
| `adapters/` | 부분 파일 적용·단일 section 파일 적용      |
| `helpers/`  | 검증·경로·hash·소유 section 보조 함수      |

## Conventions

- 제품의 required/optional 정책은 받지 않고 `desired`/`replaceDrift`만 받는다.
- 외부 hook은 패키지 루트에서 presence inspector만 고르고, 같은 패키지 subtree는 `status/` concrete 파일을 직접 import한다.
- hook 격리는 `sideEffects: false` tree-shaking과 emitted byte·output forbidden-pattern guard로 검증한다.
- 전체 status는 저장된 배포와 effective target의 활성을 구분한다.
- section public status는 canonical-first stored facts와 effective-only active facts를 함께 반환하고, planning은 별도 stored inspection을 사용한다.
- 테스트된 내장 상수만 trusted presence로 런타임 재검증을 생략한다.
- 고아 폐기는 명시적인 owner 네임스페이스 내부로 제한한다.
- `content: null`은 누락 템플릿이며 원하는 문서를 덮지 않고 skip한다.
- planner는 문서 판정·변경 계산·고아 정리를 별도 단일 함수로 조합한다.

## Boundaries

### Always do

- 두 어댑터에 같은 copy/update/remove/drift 사실표를 적용한다.
- 비소유 파일·구간과 marker 밖 텍스트를 보존한다.
- current와 legacy가 함께 있으면 current를 상태 정본으로 사용한다.
- directory legacy drift는 바이트를 보존해 current 주소로 이동하고 drift로 보고한다.
- section presence는 effective target에서 읽히는 규칙만 deployed로 보고한다.

### Ask first

- rule action 의미, filename/legacy filename 계약 변경.

### Never do

- 첫 manifest 항목에서 owner를 추론하거나 사용자 drift를 자동 교체하고, 파일 시스템 함수를 직접 호출.

## Dependencies

- 내부 `targets`·`transactions`·`validation`, 외부 `@ogham/cross-platform` 루트.
