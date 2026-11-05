# src — Contract

## Requirements

- 규칙 본문은 하니스가 로드합니다. 훅은 standard/strict SessionStart의 규칙 요약·다이얼·drift·선출·체인, UserPromptSubmit의 활성 바인딩 진행 줄 또는 무바인딩 턴의 다이얼별 진입 줄, 명시적 작업 참여의 ACK와 관측된 검증·실패 변화만 전달합니다. 작업 선택 시점에 변화 종류를 알리기 위해 사용자 턴 경계에서 진입 줄을 제공합니다. 편집 뒤에는 워크플로우 선택 시점을 놓칩니다.
- 어떤 훅도 차단하지 않는다. 신호는 제안이고 판정은 모델이 한다.
- off/advisory는 신규 관측과 주입을 하지 않습니다. 신뢰되는 경계는 기존 참여만 무효화할 수 있으며 무주입 결과의 wire stdout은 비어 있습니다.
- 훅 도달 코드는 배럴을 거치지 않고 concrete 파일을 직접 import 한다. esbuild 가 배럴의 재노출 그래프 전체를 번들에 끌어오고 `build:hooks` 의 크기 가드가 이를 빌드 실패로 막기 때문이다 — typecheck 는 이 비대를 잡지 못한다.
- 상태의 진실은 파일시스템이 소유한다. 규칙 배포 상태를 config 에 미러링하지 않는다.
- `version.ts` 는 자동 생성 파일이며 직접 수정하지 않는다.

## API Contracts

- 배포 진입점은 esbuild 산출물이다: MCP 서버(원본 `mcp/serverEntry/`)와 훅 번들 6종을 호스트별로 각각 방출한다. 방출 경로와 호스트별로 나뉜 이유는 플러그인 루트 `DETAIL.md`의 Requirements 절을 따른다.
- `src/index.ts` 는 named re-export 만 담는 공개 배럴이다.
- 배포 compile은 dist의 JavaScript와 선언 파일을 실제 생성하여 package exports를 충족합니다. 상위 typecheck용 noEmit 설정은 build에서 해제합니다.
- 게이트의 `CHECK` 는 실제 결과 조건을 검사하는 명령이고 `EXPECT` 는 조건 충족 시에만 관측되는 리터럴 성공 문자열이다. 결과 조건의 값은 저장소와 계획이 소유한다. 결과 조건을 CHECK가 검사하게 하여 저장소 정규식을 훅에서 실행하지 않는다.
- 다이얼·규칙 배포·actor 참여·작업 증거는 서로 다른 소유 상태이며 각 소유 모듈의 계약을 따른다.

## Acceptance Criteria

스킬 정책의 제품 계약은 플러그인 루트의 [DETAIL.md](../DETAIL.md)가 소유한다. 아래 여섯 그룹은 이 모듈의 검증 파일이 그 계약을 고정하는 바인딩이며, 스킬 목록과 템플릿이 서로 다른 정책을 갖지 않도록 같은 ID를 사용한다.

### AC-architecture-records — 아키텍처 기록의 호출 경계

- 스킬 분류와 워크플로우 체인은 루트의 AC-architecture-records를 보존한다. 아키텍처 기록을 구현 단계로 오인해 자동 실행하지 않기 위한 경계다.

### AC-skill-visibility — 발견과 참여의 분리

- 스킬 분류와 frontmatter는 루트의 AC-skill-visibility를 함께 만족한다. 모델이 스킬을 발견하는 것과 작업에 참여하는 것을 혼동하지 않도록 한다.

### AC-check-expect-pair — 검증 조건의 보존

- 계획·검토 스킬은 루트의 AC-check-expect-pair를 함께 적용한다. 명령의 정상 종료만으로 결과 조건을 충족했다고 판단하지 않도록 한다.

### AC-workflow-entry-validity — 유효한 진입 경로

- 진입 스킬은 루트의 AC-workflow-entry-validity를 보존한다. 입력 옵션, 새 심볼, 비테스트 증상을 잘못 분류하여 정당한 작업 진입을 막지 않도록 한다.

### AC-planning-method-selection — 선택한 계획법의 보존

- 계획·검토 스킬은 루트의 AC-planning-method-selection을 함께 적용한다. 검토가 선택된 방법을 기본법으로 바꾸거나 구조적 판단의 근거를 잃지 않도록 한다.

### AC-document-language — 문서 언어의 일관성

- 문서 작성 스킬 목록과 템플릿은 루트의 AC-document-language를 함께 만족한다. 영어 템플릿이 세션의 문서 언어를 덮어쓰지 않도록 한다.

### AC-no-rule-injection — 규칙 본문 비주입

- 어떤 훅 출력에도 규칙 문서 본문이 실리지 않는다.
- 훅은 규칙 문서 본문을 보고하지 않습니다. standard/strict SessionStart는 규칙 이름·상태 요약과 선출·체인을, 그 밖의 훅은 활성 바인딩 진행 줄 또는 무바인딩 턴의 진입 줄과 활성 작업의 ACK·증거·실패 변화만 제공합니다.

### AC-hook-non-blocking — 비차단

- 모든 훅이 차단 결정을 반환하지 않는다.
- `off`와 모든 no-op 경로의 entry stdout이 비어 있고 exit 0을 유지한다.

### AC-hook-bundle-size — 번들 크기 가드

- `build:hooks` 의 바이트 캡을 넘는 번들이 생기지 않는다.
- setup은 실측 크기 22.1KiB로 23KiB 상한을 유지하고, post-tool-use는 22KiB 상한을 둡니다. 번들이 그 값을 넘으면 실측한 뒤 상한과 그 사유 주석을 손으로 갱신합니다. 나머지는 16KiB를 유지하며 금지 의존 검사도 유지합니다.

### AC-mcp-bundle-wiring — 배포 MCP 번들 검증

- 실제 배포 번들에 연결하여 선언된 도구 목록과 객체 입력 스키마를 검증합니다.
- 클라이언트 종료 요청 직후에도 Windows가 작업 폴더를 잠글 수 있으므로, 임시 폴더 정리는 비동기 삭제로 일시적 잠금을 제한적으로 재시도합니다. 재시도를 소진한 오류는 테스트 실패로 보고합니다.

## Boundary Exemptions

### version.ts — Generated version constant has no entry point

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: `version.ts` 는 생성기가 만드는 단일 상수 파일이고 아무것도 import 하지 않는다. 배럴을 경유시키면 `src → mcp → server → src` 순환이 생기므로, 이 참조는 경계를 넘는 대신 면책을 받는다.

## Last Updated

배송 표면·소유 상태·경계 계약의 내용과 근거가 바뀔 때 갱신한다.
