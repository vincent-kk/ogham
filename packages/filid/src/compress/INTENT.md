# compress -- 컨텍스트 압축 전략

## Purpose

AI 에이전트 컨텍스트 윈도우를 절약하기 위한 두 가지 상호 배타적 압축 전략을 제공한다. 원본 복원이 필요한 파일은 가역 참조로, 축적된 이벤트 히스토리는 비가역 요약으로 처리한다.

## Structure

| 모듈 | 전략 | 복원 |
|------|------|------|
| `reversible-compactor` | `[REF]`/`[EXPORTS]`/`[LINES]` 3줄 참조. 원본 파일은 디스크에 보존 | 가능 (경로 재읽기) |
| `lossy-summarizer` | 도구 호출 이벤트 배열 → 집계 요약 1건 | 불가 |

## Conventions

- 모든 압축 함수는 순수 함수 — 파일 I/O·네트워크 금지
- 결과에는 반드시 `CompressionMeta`(method·originalLines·compressedLines·timestamp·recoverable) 포함
- `recoverable` 플래그는 모듈 정체성: reversible=true, lossy=false (절대 반대 금지)
- 하위 모듈 간 직접 import 금지 — 공유 로직은 `types/documents.ts`로 이동

## Boundaries

### Always do

- 새 전략 추가 시 `CompressionMeta['method']` 유니온과 `compress/index.ts` 배럴 동기화
- 빈 입력에도 유효한 `CompressionMeta` 반환 (zero-filled 허용, throw 금지)

### Ask first

- 두 전략을 결합한 하이브리드(부분 가역) 압축 도입
- 압축 대상을 파일/이벤트 외 다른 데이터 타입으로 확장

### Never do

- `core/`, `mcp/`, `hooks/`, `ast/` 역방향 import
- 원본 데이터를 복사해 결과 객체 내부에 숨기기 (가역 전략은 참조만)

## Dependencies

- `../types/documents.js` (`CompressionMeta`)
