# Filid 1.0 Product Contract

## Requirements

- Filid는 INTENT.md와 DETAIL.md의 의도, 경계, 현재 계약을 관리한다.
- Filid는 FCA 노드, 어댑터가 보고한 진입점, 외부 import 경계와 실제 의존 DAG를 검사한다.
- Filid는 소비자 소유 프랙탈을 근거로 `sourcePath → targetPath` 이동 계획과 사전·사후조건을 만들되 프로젝트 파일을 이동하거나 import를 고치지 않는다.
- Filid의 cross-review는 `review_state prepare`가 변경 roster·FCA 후보를 선별·청킹·그룹화하고 규칙·diff·brief를 물질화하며, 그룹별 actor가 JSON opinion과 verification을 쓴다. `validate`가 이를 검사하고 `seal`이 검증된 hash만 결정적으로 fold·렌더링한다. 코드는 수정하지 않는다.
- `revalidate`는 FCA category를 항목 소유 프랙탈에서 재측정하고, 관련 규칙의 증거가 스캔 경계 밖이라 불확실할 때만 해당 `fractal_inspect` `resolve` 결과의 `data.results[].summary.chainPaths` 상위 프랙탈을 순서대로 재시도해 최초의 exact 결과로 판정한다. 비-FCA category는 accepted FIX ID를 canonical fix request와 결합해 원 finding 전체를 복원하고 verifier 재검증으로 판정한다.
- `pull-request`는 변경 경로 중 FCA owner가 있는 범위만 문서 동기화하고, config-declared 또는 현재 `HEAD`에 존재하는 ownerless non-FCA 경로는 이유와 함께 보고한다. owner를 잃은 삭제 경로와 다른 해석 실패는 PR 본문의 `FCA Handoff`에 `unresolved-path`로 기록하고 계속한다.
- `pull-request`는 FCA 문서 commit과 PR 생성·갱신을 수행하며, 문서 commit 이후 원격 branch와 현재 HEAD를 다시 비교해 뒤처졌으면 기본적으로 push한 뒤 게시한다. `--no-push`와 publication 실패는 branch별로 저장된 body를 남겨 복구할 수 있어야 한다.
- `pull-request`의 문서 동기화는 PR 생성을 막지 않는다. Stage 1은 `enrich-docs --repair`로 문서 계약 finding만 고치고, 고치지 못한 finding·indeterminate 증거·동기화 실패는 PR 본문의 `FCA Handoff` 섹션과 `<!-- filid:handoff v1 -->` 블록에 기록해 cross-review의 change context로 넘긴다. 소스·import·파일 배치 finding은 여기서 고치지 않는다.
- Filid의 resolve는 confirmed fix 전체를 한 decision sheet에 모아 Severity/Category와 독립적인 적용 추천을 표시하고, 명백하거나 영향이 작은 수정은 기본 선택한 채 논쟁적인 결정만 전면에 둔다.
- spec-document는 파일당 15 cases, test-record는 파일당 32 cases를 허용하고 두 역할 사이의 promotion 관계를 만들지 않는다.
- core, policy와 MCP DTO는 언어·확장자·진입점 이름·테스트 프레임워크 호출 문법을 알지 않으며 등록된 어댑터가 생태계 사실을 제공한다.
- Filid는 Seiri 런타임 없이 독립적으로 동작하며 `@ast-grep/napi`, 전역 npm 모듈 탐색, `fast-glob`에 의존하지 않는다.
- 패키지는 MCP·훅·스킬을 배포하는 private plugin이며 npm library surface를 제공하지 않는다.
- 규칙 문서와 플러그인 생성물은 canonical source와 공식 빌드 파이프라인으로만 갱신한다.

## API Contracts

- 공개 MCP 도구는 `project_setup`, `fractal_inspect`, `restructure`, `review_state`의 4개다.
- `fractal_inspect`의 `resolve` action은 하나 이상의 target request를 한 snapshot에서 순서대로 해석하며, 단일 target도 길이 1의 `requests` 배열로 전달한다.
- 사용자 스킬은 12개다. 상시 7개는 `setup`, `scan`, `context-query`, `guide`, `enrich-docs`, `restructure`, `migrate`이고, merge-track 5개는 `pull-request`, `cross-review`, `resolve`, `revalidate`, `pipeline`이다.
- merge-track 각 단계의 **출력 형식**이 계약이다. PR 본문은 `skills/pull-request/reference.md` §3과 handoff 블록 §7, review report와 PR comment는 `skills/cross-review/report-formats.md`, fix request의 여덟 필드 블록은 `skills/cross-review/templates.md`, 수용/거부 기록은 `skills/resolve/reference.md` §1, 재검증 결과는 `skills/revalidate/reference.md` §3이 정의한다. 스킬 실행에 필요한 형식은 스킬 폴더 안에 두며 플러그인 내부 INTENT/DETAIL을 색인하지 않는다. 이 경로들은 단계 간 입력 형식의 정본이므로 실제 위치를 가리켜야 하며, 형식이 깨지면 다음 단계가 입력을 읽지 못한다.
- cross-review의 resumable·cached 산출물은 `review_schema: 7`과 state schema 2를 선언한다. 이전 marker·state는 현재 결과로 반환하지 않고 fresh prepare로 재생성한다.
- fix request는 검증 가능한 원 claim을 포함하며, resolve가 만든 accepted FIX ID는 revalidate에서 해당 canonical request의 Severity, Category, Path, Rule, Claim, Evidence, Consequence, Recommended Action과 정확히 결합된다.
- interactive resolve는 항목별 질문을 반복하지 않는다. 전체 sheet 뒤 한 batch decision round에서 추천안 일괄 적용, 전체 적용, ID별 적용·논의·warning 생략·근거 있는 거부를 받고, 논의가 남으면 미결 항목만 다시 묶는다. `--auto`도 같은 sheet와 원래 추천을 보여 주되 decision만 전부 자동 선택하고 질문하지 않는다.
- `cross-review`와 `revalidate`는 브랜치에 pull request가 있을 때 판정을 PR 코멘트로 남긴다. PR이 없으면 남기지 않으며, 코멘트 부재는 실패가 아니다. 코멘트 형식은 각각 `skills/cross-review/report-formats.md`와 `skills/revalidate/reference.md` §4가 정의한다 — 판정표는 접힘 밖, 본문은 접힘 안, 호스트 코멘트 크기 상한 안에 들어가고, 같은 표제의 기존 코멘트는 새로 달지 않고 갱신한다.
- 단계 간 중간 산출물은 `.filid/review/<branch>/`에 파일로 남기고 다음 단계와 서브에이전트에는 **경로만** 전달한다. 대형 변경에서 컨텍스트가 터지지 않게 하는 장치이며 이 파일들은 커밋하지 않는다.
- 모든 큰 MCP 결과는 16 KiB inline 예산의 공통 envelope를 거쳐 검증 가능한 임시 artifact로 전달한다. 스킬은 inline data가 없으면 artifact의 JSON data를 읽고, 누락·읽기 실패를 빈 성공 결과로 해석하지 않는다.
- managed rule 문서의 host target 선택과 동기화는 `@ogham/agent-artifacts`에 위임하며 Filid owner 주소 밖의 사용자 내용을 보존한다.
- 설정 schema 2.0은 adapter mode와 enabled IDs, rule overrides, 언어 중립 구조 옵션을 정의한다. v1은 메모리에서 변환하고 명시적 저장 전까지 원본을 쓰지 않는다.
- PR 문서 audit 범위는 모든 변경을 한 `fractal_inspect` `resolve` batch로 해석한다. `resolved:true` owner는 config-excluded 이름 아래에서도 유지하고, `resolved:false`인 `context-target-unresolved`는 target이 현재 `HEAD`에 존재할 때만 ownerless non-FCA다. `structure.additionalExcludedDirectories`는 그 ownerless 이유를 명시하며, 그 밖의 실패는 범위를 축소하지 않는다.

## Acceptance Criteria

### AC-root-surface — 1.0 공개 표면

- MCP 도구는 정확히 4개, 사용자 스킬은 정확히 12개이며 각각 독립 oracle이 고정한다.
- 제거된 AST·메트릭 도구와 스킬 7개(`ast-fallback`, `config-wizard`, `harvest`, `promote`, `structure-review`, `sync`, `update`)는 등록되거나 배포되지 않는다.

### AC-root-independence — 독립 실행

- Seiri가 없는 프로젝트에서 모든 Filid 기능이 동작한다.
- 제거 대상 dependency와 전역 npm 탐색 없이 typecheck, test, build가 성공한다.

### AC-root-boundaries — 제품 소유권

- 구조 변경 API는 계획과 검증만 제공하고 프로젝트 파일을 수정하지 않는다.
- cross-review는 변경 범위에 한해 결함·보안·성능·유지보수·테스트·문서·FCA 계약을 판정하고, 모든 후보 finding을 독립 검증한다.
- cross-review는 현재 사용자 지시에 안정 ID를 부여해 reviewer와 verifier가 같은 authoritative requirement를 독립 확인하게 하고, 정상적인 in-scope evidence gap은 reviewed coverage와 별개로 언제나 `INCONCLUSIVE`로 판정한다.
- cross-review는 review schema 7·state schema 2가 아닌 resumable·cached 산출물을 반환하지 않는다.
- reviewable unit의 configured group cap, skipped roster의 가시성과 validate hash handoff 중 어느 것도 편의를 위해 완화하지 않는다.

### AC-root-pr-comment — 판정의 PR 전달

- PR이 있는 브랜치에서 `cross-review`와 `revalidate`는 판정을 코멘트로 남기고, PR이 없으면 남기지 않으며 어느 쪽도 스킬을 실패시키지 않는다.
- 코멘트는 판정표를 접힘 밖에 두고 나머지를 접어 호스트 크기 상한 안에 들어가며, 재실행은 브랜치당 코멘트를 하나로 유지한다.
- 코멘트 실패나 부재가 판정 자체를 바꾸지 않는다.
- cached cross-review도 기존 seal로 현재 source와 canonical 게시 경로를 확인한 뒤 코멘트 전달을 재시도한다. reviewer round는 다시 실행하지 않는다.

### AC-root-pr-document-scope — PR 문서 동기화 범위

- 현재 `HEAD`에 존재하는 ownerless 경로는 non-FCA로 보고되며, config-excluded 이름은 그 이유를 보강한다. config-excluded 이름 아래라도 `fractal_inspect` `resolve` 결과에 owner가 있으면 문서 동기화 대상이다.
- `HEAD`에 없는 unresolved 경로와 `context-target-unresolved` 이외의 실패는 non-FCA로 바뀌지 않고 `FCA Handoff`에 `unresolved-path`로 기록된다. PR 생성은 계속된다.
- non-FCA 경로도 PR의 Code/Architecture 분석에서는 유지되며 owner가 하나도 없으면 document sync는 `no-change`다.
- PR 문서 동기화와 resolve의 문서 수정 위임은 INTENT와 DETAIL을 모두 평가한다.
- 게시 단계는 문서 commit 이후 push 필요 여부를 다시 계산하며 `--no-push`도 갱신된 결과를 따른다.

### AC-root-pr-handoff — 문서 동기화 자기복구와 handoff

- Stage 1은 `documents` 스코프 finding 중 `derivable-content`, `derivable-structure`, `stale-path`(`structure.generatedPaths` 비매치), `line-limit`, `missing-boundaries`, `missing-field`, `missing-section`, `duplicate-id`, `missing-document`만 `enrich-docs --repair`로 고친다. 수락 그룹의 `missing-field`는 근거가 없으면 `needs-rework`, `duplicate-id`는 정본 그룹 선택에 판단이 필요하면 `needs-rework`로 보류하며, Boundary Exemption의 Reason 누락은 `config-decision`으로 보류한다.
- `boundaries`, `dag`, `nodes`, `entry-points`, `verification` 스코프 finding과 certainty가 `indeterminate`/`unsupported`로 명시된 모든 finding은 고치지 않고 기록한다.
- 스캔 `status`는 편집 가부의 근거가 아니다. enrich-docs는 `scan detail: "full"`의 노드별 `documentEvidence.findings`를 편집 입력으로 쓰고, `documentEvidence`가 없거나 scan을 읽을 수 없는 문서만 보류한다. non-finding 진단은 보고하되 편집을 막지 않는다.
- RICH 문서는 `--repair`에서 finding이 이름 붙인 범위만 고치고 그 밖의 RICH 내용은 건드리지 않는다.
- PR 본문 네 번째 섹션 `## FCA Handoff`는 항상 존재하며, 접히는 표와 한 줄 JSON `<!-- filid:handoff v1 -->` 블록을 담는다. 0건이면 `None`과 빈 `recorded`다. 본문 전체는 cross-review의 `changeContext` 상한 8000자 안에 들어가도록 handoff를 먼저 줄인다.
- `review_state prepare`는 `changeContext`의 handoff 블록을 파싱해 brief의 `## FCA Handoff` 섹션으로 전달한다. 상태 스키마 2와 `evidence.md`는 바뀌지 않는다.
- 터미널 출력은 `Handoff:` 줄로 class별 개수와 repaired 개수를 보고한다.
- 입력 오류만 abort다: Stage 0의 detached/empty branch, base 대비 커밋 0, `source-dirty`, `documents-only` + `--skip-enrich`; Stage 2의 base 미해결. `GH_AUTH = false`와 `--no-push`는 body 저장 fallback이다.
- 리뷰 단계가 문서를 정교화한다. cross-review는 handoff 표의 행을 검증할 주장으로 다루고 초안 충분성·INTENT 예산·파생 내용을 `documentation` finding으로 낸다. resolve는 문서 항목을 `enrich-docs --include-detail --repair`로 위임하고, enrich-docs는 DETAIL 부재를 MISSING으로, INTENT 50행 초과분을 DETAIL로 이관한다.

### AC-root-document-quality — 빠짐없는 문서 품질 분류

- 존재하는 문서는 0점 이상 임계값 미만이면 SPARSE, 임계값 이상이면 RICH다. 문서가 없을 때만 MISSING이다.
- SPARSE와 MISSING은 편집 계획 대상으로 남는다. RICH는 `--repair`에서 `documents` 스코프 finding이 이름 붙인 섹션만 고치고 그 밖에는 편집하지 않는다. `--include-detail`에서 DETAIL.md 부재도 MISSING이다.

### AC-root-pipeline-freshness — 현재 커밋의 재검증 결과

- pipeline은 재검증 보고서에 유효한 `PASS | FAIL | INCONCLUSIVE` 판정이 있고 `head_sha`가 현재 HEAD와 일치할 때만 완료 결과를 재사용한다.
- 보고서가 낡거나 불완전하면 기존 justification·fix request·PR 근거의 우선순위로 재개하며, 관측 과정은 review state를 변경하지 않는다.

### AC-root-revalidate-scope — 항목별 재검증 범위

- accepted item의 project-relative Path는 절대 경로로 정규화하고, 각 범위에서 original `(Rule, Path)`와 정확히 일치하는 위반을 집계 수보다 먼저 판정한다.
- exact 위반이 남으면 즉시 unresolved 또는 unapplied이고 범위를 넓히지 않는다. exact 일치가 없고 관련 증거만 불확실할 때 다음 `chainPaths` 프랙탈로 넓히며, 최초의 exact 부재는 resolved다.
- PROJECT_ROOT는 재측정 범위로 쓰지 않고, 허용된 모든 프랙탈 범위가 불확실할 때만 inconclusive를 유지한다.

### AC-root-resolve-batch-decisions — resolve 일괄 의사결정

- 모든 confirmed fix는 결정 전에 한 sheet에 표시되며 Severity, Category, Recommendation, Default가 독립된 값이다.
- 명백하거나 영향이 작은 correction은 기본 적용으로 선택되고, 제품·공개 API·아키텍처 선택이 필요한 항목은 먼저 보이는 discussion focus가 된다.
- interactive 입력은 한 batch에 모든 apply, discuss, warning skip, reason-bearing reject를 담는다. error는 skip할 수 없고 논의·부적합 입력은 항목별이 아니라 미결 집합 전체로 다시 묻는다.
- baseline과 correction 위임 전에 모든 warning skip/reject 사유를 완전한 Context/Decision/Consequences로 검증한다. 그 이후 decision은 다시 열지 않으며 rejection 단계는 검증된 ADR을 직렬화만 한다.
- `--auto`는 원래 Recommendation과 이유를 보존해 표시하고 모든 Decision을 자동 적용으로 선택한 뒤 prompt 없이 진행한다.
- 자동 resolve의 하위 문서·배치 스킬에는 `--auto-approve`를 전달한다. 대화형 resolve는 해당 플래그를 전달하지 않으며, 자동 승인도 범위를 넓히거나 미결 구조 결정을 대신하지 않는다.

## History

- 2026-09-05 — `pull-request`의 문서 동기화 BLOCKED 종료를 제거하고 자기복구·handoff 기록으로 바꿨다. 테스트 파일 하나의 indeterminate certainty가 규칙 네 개와 스캔 status를 거쳐 PR 생성 전체를 막았기 때문이며, 고칠 수 없는 finding은 PR 본문에 실려 review의 입력이 된다.
- 2026-09-05 — 같은 lifecycle의 기능을 action으로 묶어 상시 schema 비용을 줄이고 도구 이름을 일관되게 만들기 위해 공개 MCP 표면을 9개에서 4개로 병합했다.
- 2026-09-04 — cross-review의 선별·청킹·그룹·규칙 해석·diff/brief 생성·JSON 검증·verdict fold·렌더링을 단일 `review_state` lifecycle로 옮겼다. orchestrator가 대형 diff와 opinion 본문을 열지 않아도 재개 가능하고, seal이 검증 후 변조된 판단을 신뢰하지 않게 하기 위한 결정이다.
- 2026-09-04 — `review_state scope`가 project-relative root `.` 위반을 변경 범위 ancestor matching에서 제외하고, verification certainty는 변경 범위와 교차하는 verification 파일에서만 계산하되 graph certainty는 project-wide로 유지하도록 수정했다.
- 2026-09-04 — `review_state scope`가 committed 변경 범위의 roster·FCA 후보·working-tree 관측과 canonical `evidence.md`를 한 snapshot에서 만들도록 책임을 옮겼다. 리뷰 프롬프트는 그룹별 판단과 독립 검증에만 집중한다.
- 2026-09-04 — cross-review를 파일별 단일 리뷰 패스와 효율 모델 독립 검증으로 전환했다. 변경 범위의 코드 품질 판정을 소유하되 전역 규칙 엔진은 소유하지 않으며, 단계 간 관점 필드를 Category로 치환했다.
- 2026-08-31 — repository-level 관리 파일 때문에 FCA owner가 있는 변경까지 PR이 막히지 않도록 config-declared와 existing ownerless 경로를 명시적 non-FCA 문서 범위로 분리했다. 삭제 경로는 자동 제외하지 않아 document drift를 숨기지 않는다.
- 2026-08-28 — 100개 이상의 변경 경로도 한 번의 snapshot으로 해석하도록 `context_resolve`와 shipped caller를 batch 계약으로 전환했다.
- 2026-08-22 — 자잘한 correction이 논쟁적인 결정을 가리지 않도록 resolve의 항목별 질문을 recommendation 기반 전체 decision sheet와 batch 입력으로 바꿨다.
- 2026-08-22 — 좁은 소비자 범위가 형제 프랙탈 증거를 보지 못해 false-INCONCLUSIVE를 만들지 않도록 revalidate를 owner-to-root 최초 exact 측정으로 바꿨다.
- 2026-08-22 — `pull-request`의 암묵적 branch push를 제거하고 호출자 책임으로 돌렸다. PR 생성 실패와 push 실패를 한 단계가 함께 숨기지 않게 하기 위한 결정이다.

## Last Updated

2026-09-05
