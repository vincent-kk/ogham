# src contract

## Requirements

- 문서 위반 타입은 `history-section`과 `last-updated-trigger`를 error로 표현한다. 필수 재구조화 산출물 역할은 INTENT 문서와 진입점이며, 선택 문서의 부재를 필수 산출물 누락으로 표시하지 않는다.

- 레이어 의존 방향은 `mcp`/`hooks` → `core` → `adapters` → `types`/`constants`/`lib` 한 방향이며 역방향 edge는 0이다.
- `factsExtractor`는 `hooks`와 같은 host 경계지만 `core`를 거치지 않는다: `factsExtractor` → `adapters` → `types`/`constants`/`lib`. `mcp`·`core`·`hooks`와 `factsExtractor` 사이의 import는 어느 방향으로도 0이다. 서버 번들과 추출 프로그램 번들이 서로의 코드를 싣지 않게 하기 위해서다.
- `core`는 생태계 리터럴을 알지 못한다. 확장자, 진입점 파일명, import 문법, 테스트 호출 문법은 `adapters/` 안에만 존재한다.
- `mcp`와 `hooks`는 host 경계이며 정책 판단을 하지 않는다.
- 새 생태계는 core, policy, MCP DTO 수정 없이 어댑터 등록만으로 추가된다.
- 소스 루트 named entry point는 FCA 경계 식별용으로 `VERSION`만 열거하고, npm manifest에는 library export를 선언하지 않는다.
- 통합 테스트의 transport 헬퍼는 연결할 SDK server를 검증 파일에서 인자로 받는다. 헬퍼가 MCP server 구현을 import하면 src에서 server로 역방향 의존이 생기므로 구체적인 server 생성은 검증 파일이 소유한다.
- `version.ts`는 `scripts/injectVersion.mjs`가 만드는 생성물이며 손으로 고치지 않는다.
- 공용 glob 변환은 고정 치환 정규식을 모듈 상수로 재사용하고, 입력별 결과 정규식은 호출마다 생성한다. 치환 순서와 glob 매칭 의미는 유지한다.
- 스캔 결과 재사용은 요청 스코프 메모 하나로만 한다. 저장소는 `AsyncLocalStorage`에 있고 스코프를 여는 쪽이 수명을 정한다. 메모 키는 결과에 영향을 주는 인자를 **받은 철자 그대로** 담는다 — 경로 인자를 정규화하면 결과가 품고 나가는 철자가 호출자마다 달라진다. 모듈 전역 캐시는 금지한다 — 한 서버 프로세스가 여러 요청을 처리하고 요청 사이에 트리가 움직이므로, 스코프보다 오래 사는 값은 사라진 트리를 답한다. 스코프가 없으면 메모는 아무것도 저장하지 않으므로 훅과 추출 프로그램은 메모가 없을 때와 같이 동작한다. 메모는 값을 받은 그대로 저장하며, 변경 가능한 값을 돌려주는 호출자가 복사본을 만든다.

## API Contracts

- 모든 MCP 반환은 공통 envelope와 16 KiB inline 예산을 따른다.
- 소스 루트는 FCA 경계 식별을 위한 버전만 노출하고 npm library surface는 두지 않는다.

## Acceptance Criteria

### AC-src-layering — 단방향 레이어

- `adapters/`에서 `core/`를 참조하는 import가 0건이다.
- `core/`와 MCP DTO에 생태계 확장자·테스트 호출 리터럴이 없다.

### AC-src-surface — 1.0 표면

- 소스 루트 entry point가 `VERSION`만 named export하고 npm manifest에는 library export가 없다.

### AC-src-generated — 생성물 불가침

- `version.ts`, `bridge/`, `public/`, host 매니페스트는 생성기가 소유하며 손편집 흔적이 없다.

## Boundary Exemptions

### `version.ts` — Generated version constant is imported directly inside the owner

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: 같은 fractal 내부 소비자는 자기 entry point를 경유하지 않고 concrete peer를 직접 참조한다. `version.ts`는 생성된 단일 상수 파일이고 아무것도 import하지 않아 런타임 순환을 만들지 않는다. 자식 fractal은 루트 파일을 직접 import하면 `src`로 가는 의존 edge가 생기므로 `constants` organ의 재노출을 경유한다.


## Last Updated

레이어 의존 방향, 생태계 중립성, 서버·추출 번들 격리나 공개 진입점 계약이 바뀔 때 갱신한다.
