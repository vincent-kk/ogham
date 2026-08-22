# Filid 1.0 Product Contract

## Requirements

- Filid는 INTENT.md와 DETAIL.md의 의도, 경계, 현재 계약을 관리한다.
- Filid는 FCA 노드, 어댑터가 보고한 진입점, 외부 import 경계와 실제 의존 DAG를 검사한다.
- Filid는 소비자 소유 프랙탈을 근거로 `sourcePath → targetPath` 이동 계획과 사전·사후조건을 만들되 프로젝트 파일을 이동하거나 import를 고치지 않는다.
- Filid의 cross-review는 계약, 구조, 검증 문서라는 FCA 증거만 판정하며 코드를 수정하지 않는다.
- `revalidate`는 항목 소유 프랙탈에서 재측정을 시작하고, 관련 규칙의 증거가 스캔 경계 밖이라 불확실할 때만 `context_resolve.summary.chainPaths`의 상위 프랙탈을 순서대로 재시도해 최초의 exact 결과로 판정한다.
- `pull-request`는 FCA 문서 commit과 PR 생성·갱신을 수행하되 원격 branch를 push하지 않는다. 호출자가 branch를 먼저 push해야 하며, publication 실패는 저장된 body로 복구할 수 있어야 한다.
- Filid의 resolve는 confirmed fix 전체를 한 decision sheet에 모아 severity/perspective와 독립적인 적용 추천을 표시하고, 명백하거나 영향이 작은 수정은 기본 선택한 채 논쟁적인 결정만 전면에 둔다.
- spec-document는 파일당 15 cases, test-record는 파일당 32 cases를 허용하고 두 역할 사이의 promotion 관계를 만들지 않는다.
- core, policy와 MCP DTO는 언어·확장자·진입점 이름·테스트 프레임워크 호출 문법을 알지 않으며 등록된 어댑터가 생태계 사실을 제공한다.
- Filid는 Seiri 런타임 없이 독립적으로 동작하며 `@ast-grep/napi`, 전역 npm 모듈 탐색, `fast-glob`에 의존하지 않는다.
- 패키지는 MCP·훅·스킬을 배포하는 private plugin이며 npm library surface를 제공하지 않는다.
- 규칙 문서와 플러그인 생성물은 canonical source와 공식 빌드 파이프라인으로만 갱신한다.

## API Contracts

- 공개 MCP 도구는 `project_init`, `rule_docs_sync`, `open_settings`, `fractal_scan`, `context_resolve`, `restructure_plan`, `structure_validate`, `verification_scan`, `review_state`의 9개다.
- 사용자 스킬은 12개다. 상시 7개는 `setup`, `scan`, `context-query`, `guide`, `enrich-docs`, `restructure`, `migrate`이고, merge-track 5개는 `pull-request`, `cross-review`, `resolve`, `revalidate`, `pipeline`이다.
- merge-track 각 단계의 **출력 형식**이 계약이다. PR 본문은 `skills/pull-request/reference.md` §3, 리뷰 보고서와 fix 요청은 `skills/cross-review/templates.md`, 수용/거부 기록은 `skills/resolve/reference.md` §1, 재검증 결과는 `skills/revalidate/reference.md` §3이 정의한다. 이 경로들은 단계 간 입력 형식의 정본이므로 실제 skill 위치를 가리켜야 하며, 형식이 깨지면 다음 단계가 입력을 읽지 못한다.
- interactive resolve는 항목별 질문을 반복하지 않는다. 전체 sheet 뒤 한 batch decision round에서 추천안 일괄 적용, 전체 적용, ID별 적용·논의·warning 생략·근거 있는 거부를 받고, 논의가 남으면 미결 항목만 다시 묶는다. `--auto`도 같은 sheet와 원래 추천을 보여 주되 decision만 전부 자동 선택하고 질문하지 않는다.
- `cross-review`와 `revalidate`는 브랜치에 pull request가 있을 때 판정을 PR 코멘트로 남긴다. PR이 없으면 남기지 않으며, 코멘트 부재는 실패가 아니다. 코멘트 형식은 `skills/cross-review/templates.md`와 `skills/revalidate/reference.md` §4가 정의한다 — 판정표는 접힘 밖, 본문은 접힘 안, 호스트 코멘트 크기 상한 안에 들어가고, 같은 표제의 기존 코멘트는 새로 달지 않고 갱신한다.
- 단계 간 중간 산출물은 `.filid/review/<branch>/`에 파일로 남기고 다음 단계와 서브에이전트에는 **경로만** 전달한다. 대형 변경에서 컨텍스트가 터지지 않게 하는 장치이며 이 파일들은 커밋하지 않는다.
- 모든 큰 MCP 결과는 16 KiB inline 예산의 공통 envelope를 거쳐 검증 가능한 임시 artifact로 전달한다.
- managed rule 문서의 host target 선택과 동기화는 `@ogham/agent-artifacts`에 위임하며 Filid owner 주소 밖의 사용자 내용을 보존한다.
- 설정 schema 2.0은 adapter mode와 enabled IDs, rule overrides, 언어 중립 구조 옵션을 정의한다. v1은 메모리에서 변환하고 명시적 저장 전까지 원본을 쓰지 않는다.

## Acceptance Criteria

### AC-root-surface — 1.0 공개 표면

- MCP 도구는 정확히 9개, 사용자 스킬은 정확히 12개이며 각각 독립 oracle이 고정한다.
- 제거된 AST·메트릭 도구와 스킬 7개(`ast-fallback`, `config-wizard`, `harvest`, `promote`, `structure-review`, `sync`, `update`)는 등록되거나 배포되지 않는다.

### AC-root-independence — 독립 실행

- Seiri가 없는 프로젝트에서 모든 Filid 기능이 동작한다.
- 제거 대상 dependency와 전역 npm 탐색 없이 typecheck, test, build가 성공한다.

### AC-root-boundaries — 제품 소유권

- 구조 변경 API는 계획과 검증만 제공하고 프로젝트 파일을 수정하지 않는다.
- cross-review finding은 FCA 증거만 인용한다.

### AC-root-pr-comment — 판정의 PR 전달

- PR이 있는 브랜치에서 `cross-review`와 `revalidate`는 판정을 코멘트로 남기고, PR이 없으면 남기지 않으며 어느 쪽도 스킬을 실패시키지 않는다.
- 코멘트는 판정표를 접힘 밖에 두고 나머지를 접어 호스트 크기 상한 안에 들어가며, 재실행은 브랜치당 코멘트를 하나로 유지한다.
- 코멘트 실패나 부재가 판정 자체를 바꾸지 않는다.

### AC-root-revalidate-scope — 항목별 재검증 범위

- accepted item의 project-relative Path는 절대 경로로 정규화하고, 각 범위에서 original `(Rule, Path)`와 정확히 일치하는 위반을 집계 수보다 먼저 판정한다.
- exact 위반이 남으면 즉시 unresolved 또는 unapplied이고 범위를 넓히지 않는다. exact 일치가 없고 관련 증거만 불확실할 때 다음 `chainPaths` 프랙탈로 넓히며, 최초의 exact 부재는 resolved다.
- PROJECT_ROOT는 재측정 범위로 쓰지 않고, 허용된 모든 프랙탈 범위가 불확실할 때만 inconclusive를 유지한다.

### AC-root-resolve-batch-decisions — resolve 일괄 의사결정

- 모든 confirmed fix는 결정 전에 한 sheet에 표시되며 Severity, Perspective, Recommendation, Default가 독립된 값이다.
- 명백하거나 영향이 작은 correction은 기본 적용으로 선택되고, 제품·공개 API·아키텍처 선택이 필요한 항목은 먼저 보이는 discussion focus가 된다.
- interactive 입력은 한 batch에 모든 apply, discuss, warning skip, reason-bearing reject를 담는다. error는 skip할 수 없고 논의·부적합 입력은 항목별이 아니라 미결 집합 전체로 다시 묻는다.
- baseline과 correction 위임 전에 모든 warning skip/reject 사유를 완전한 Context/Decision/Consequences로 검증한다. 그 이후 decision은 다시 열지 않으며 rejection 단계는 검증된 ADR을 직렬화만 한다.
- `--auto`는 원래 Recommendation과 이유를 보존해 표시하고 모든 Decision을 자동 적용으로 선택한 뒤 prompt 없이 진행한다.

## History

- 2026-08-22 — 자잘한 correction이 논쟁적인 결정을 가리지 않도록 resolve의 항목별 질문을 recommendation 기반 전체 decision sheet와 batch 입력으로 바꿨다.
- 2026-08-22 — 좁은 소비자 범위가 형제 프랙탈 증거를 보지 못해 false-INCONCLUSIVE를 만들지 않도록 revalidate를 owner-to-root 최초 exact 측정으로 바꿨다.
- 2026-08-22 — `pull-request`의 암묵적 branch push를 제거하고 호출자 책임으로 돌렸다. PR 생성 실패와 push 실패를 한 단계가 함께 숨기지 않게 하기 위한 결정이다.

## Last Updated

2026-08-22 — revalidate의 항목별 범위 확대와 exact 판정 우선순위, resolve의 일괄 decision sheet와 recommendation/default 계약을 고정했다.
