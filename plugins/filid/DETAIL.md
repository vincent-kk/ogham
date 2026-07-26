# Filid 1.0 Product Contract

## Requirements

- Filid는 INTENT.md와 DETAIL.md의 의도, 경계, 현재 계약을 관리한다.
- Filid는 FCA 노드, 어댑터가 보고한 진입점, 외부 import 경계와 실제 의존 DAG를 검사한다.
- Filid는 소비자 소유 프랙탈을 근거로 `sourcePath → targetPath` 이동 계획과 사전·사후조건을 만들되 프로젝트 파일을 이동하거나 import를 고치지 않는다.
- Filid의 cross-review는 계약, 구조, 검증 문서라는 FCA 증거만 판정하며 코드를 수정하지 않는다.
- spec-document는 파일당 15 cases, test-record는 파일당 32 cases를 허용하고 두 역할 사이의 promotion 관계를 만들지 않는다.
- core, policy와 MCP DTO는 언어·확장자·진입점 이름·테스트 프레임워크 호출 문법을 알지 않으며 등록된 어댑터가 생태계 사실을 제공한다.
- Filid는 Seiri 런타임 없이 독립적으로 동작하며 `@ast-grep/napi`, 전역 npm 모듈 탐색, `fast-glob`에 의존하지 않는다.
- 패키지는 MCP·훅·스킬을 배포하는 private plugin이며 npm library surface를 제공하지 않는다.
- 규칙 문서와 플러그인 생성물은 canonical source와 공식 빌드 파이프라인으로만 갱신한다.

## API Contracts

- 공개 MCP 도구는 `project_init`, `rule_docs_sync`, `open_settings`, `fractal_scan`, `context_resolve`, `restructure_plan`, `structure_validate`, `verification_scan`, `review_state`의 9개다.
- 사용자 스킬은 `setup`, `scan`, `context-query`, `guide`, `enrich-docs`, `restructure`, `cross-review`, `migrate`의 8개다.
- 모든 큰 MCP 결과는 16 KiB inline 예산의 공통 envelope를 거쳐 검증 가능한 임시 artifact로 전달한다.
- managed rule 문서의 host target 선택과 동기화는 `@ogham/agent-artifacts`에 위임하며 Filid owner 주소 밖의 사용자 내용을 보존한다.
- 설정 schema 2.0은 adapter mode와 enabled IDs, rule overrides, 언어 중립 구조 옵션을 정의한다. v1은 메모리에서 변환하고 명시적 저장 전까지 원본을 쓰지 않는다.

## Acceptance Criteria

### AC-root-surface — 1.0 공개 표면

- MCP 도구는 정확히 9개, 사용자 스킬은 정확히 8개다.
- 제거된 AST·메트릭·PR lifecycle 기능은 등록되거나 배포되지 않는다.

### AC-root-independence — 독립 실행

- Seiri가 없는 프로젝트에서 모든 Filid 기능이 동작한다.
- 제거 대상 dependency와 전역 npm 탐색 없이 typecheck, test, build가 성공한다.

### AC-root-boundaries — 제품 소유권

- 구조 변경 API는 계획과 검증만 제공하고 프로젝트 파일을 수정하지 않는다.
- cross-review finding은 FCA 증거만 인용한다.

## Last Updated

2026-07-26 — 승인된 Filid 1.0 Plan of Record에 맞춰 제품 계약을 재정의했다.
