# Skills & Agents — 스킬 9개 + 에이전트 3개

## 공통 컨벤션

- 스킬 이름은 플러그인 prefix 없이 bare name — 호출은 `/imbas:<skill>`.
- 다단계 스킬은 상단 `EXECUTION MODEL`에서 연속 실행을 선언하고, MCP·subagent·provider 반환 뒤 같은 turn에서 다음 단계로 이어간다 (중간 요약으로 turn을 끝내지 않음).
- provider 분기: 스킬은 `config.provider`를 읽고 `references/<provider>/`만 읽는다. 다른 provider의 references는 읽지 않는다 (cross-provider leakage 금지).
- Jira 상호작용은 `[OP:<name>]` 표기 — `.shared/operations/<name>.md`가 REST 의도를 정의하고, 세션의 Atlassian 도구가 실행을 결의한다.

## User-invocable (8)

### `setup` — 초기화·설정

- **입력**: subcommand — `init` `show` `set-project` `set-provider` `set-language` `refresh-cache` `clear-temp` `labels`
- **동작**: `init`은 `open_settings`로 브라우저 폼을 열어 provider·project ref·라벨·언어·estimation 계수를 한 번에 받는다 (`bootstrap`으로 세션이 아는 가용 provider·감지 repo·Jira 프로젝트 목록 주입). 저장 후 같은 turn에서 `refresh-cache`로 provider 메타데이터를 `cache/*.json` 파일에 채운다.
- **v2 변경**: cache 스킬 흡수 — 캐시 파일은 MCP 도구 없이 setup이 Read/Write로 관리. estimation 계수 섹션 추가.

### `refine` — 기획서 재구조화·검증 (P1)

- **입력**: 기획 문서 경로/URL (+ supplements)
- **동작**: `run_create` → analyst 서브에이전트가 ① 5종 검증(모순·발산·누락·논리 불가·테스트 가능성) ② 표준 섹션 구조로 재편(배경/목표/범위/유저 플로우/기능 명세/정책/AC/비범위)을 수행 → `refined.md` + `validation-report.md` 저장 → `run_transition`(complete refine, PASS/WARN/FAIL 판정 포함).
- **게이트**: FAIL이면 blocker report로 중단. 원본은 읽기 전용(원본 불변 원칙) — 재구조화는 `refined.md`로만.
- **v2 변경**: validate에서 개명·확장. 재구조화 산출물이 estimate·split의 표준 입력이 된다.

### `estimate` — manday 추산·일정 (P2, 선택)

- **입력**: `refined.md` (기본) 또는 원본 문서; 옵션 — team_size 등 config 재정의
- **동작**: estimator 서브에이전트가 3뷰(페이지/기능/모듈) 분해 → reconciliation → 단위별 PERT 추정 → 의존성 기반 일정 배치. `manifest_save`(type: estimation)로 스키마 검증 저장 + `estimation-report.md`(gantt 포함) 렌더 → `run_transition`.
- **게이트 없음**: 추산은 정보 산출 — split의 전제 조건이 아니다. `run_transition skip`으로 생략 가능.
- **상세**: [estimation.md](./estimation.md)

### `split` — 이슈 분할·생성 (P3)

- **입력**: `refined.md` + (있으면) `estimation.json`
- **동작**: ① planner가 INVEST Story/Task/Bug 분할(3→1→2 검증, 크기 초과 시 수평 분할) → analyst 역추론 검증 → `manifest_save`(type: stories) ② 사용자 승인 게이트(매니페스트 요약 제시) ③ provider 이슈 생성 — jira는 `[OP:create_issue]` 등, github는 gh CLI, local은 `.imbas/<KEY>/issues/*.md`. 각 항목 성공 시 `issue_ref`·`status` 즉시 기록(멱등·재개 지원) → `run_transition`.
- **estimation 연계**: `estimation.json`이 있으면 Story별 expected manday를 이슈 본문에 병기.
- **v2 변경**: 기존 split(분할) + manifest(실행)를 승인 게이트를 사이에 둔 한 스킬로 통합. dry-run 유지.

### `scaffold-pr` — Draft PR 골격

- **입력**: 이슈 참조 (jira key / `owner/repo#N` / local ID)
- **동작**: read-issue로 이슈 맥락 로드 → 브랜치·empty commit·Draft PR 생성, 본문에 하위 작업 체크리스트. 코드 변경 없음.
- **v2 변경**: 없음 (유지).

### `digest` — 이슈 스레드 압축 요약

- **입력**: 이슈 참조
- **동작**: read-issue로 본문+코멘트 스레드 로드 → State Tracking + QA-Prompting으로 압축 요약 → provider 코멘트(jira/github) 또는 `## Digest` 엔트리(local)로 게시. digest marker로 중복 게시 방지.
- **v2 변경**: 없음 (유지).

### `status` — 진행 조회

- **입력**: 옵션 — run_id / project ref
- **동작**: `run_list`/`run_get`으로 phase 진행·매니페스트 요약·blocker를 표시. 산출물 파일 존재 여부(refined/estimation/stories)도 함께.
- **v2 변경**: devplan 표시 제거, estimation 표시 추가.

### `pipeline` — 전체 자동 실행

- **입력**: 문서 경로/URL; 옵션 — `--skip-estimate`, auto-approve 게이트 설정
- **동작**: refine → estimate(생략 가능) → split을 연속 실행. 게이트: refine FAIL → blocker report 중단, split 승인 게이트는 auto-approval 조건(경고 0건 등) 충족 시 자동 통과.
- **v2 변경**: devplan·manifest-devplan 단계 제거. auto-approval-gates 문서는 새 3단계 기준으로 재작성.

## Internal (1)

### `read-issue`

- **호출자**: refine, split, digest, scaffold-pr (기존 이슈를 입력·참조로 받을 때)
- **동작**: 이슈 본문 + 코멘트 스레드(jira) / 이슈 스레드(github) / Digest 엔트리(local)를 읽어 대화 맥락을 구조화 JSON으로 반환.
- **v2 변경**: 없음 (유지). cache 파일은 있으면 읽고, 없으면 provider 직접 조회.

## Agents (3)

| Agent         | Model  | maxTurns | Tools                  | 역할                                            | 호출자                  |
| ------------- | ------ | -------- | ---------------------- | ----------------------------------------------- | ----------------------- |
| **analyst**   | sonnet | 50       | Read, Grep, Glob, Bash | 5종 검증 + 재구조화(P1), 분할 역추론 검증(P3)   | refine, split, pipeline |
| **planner**   | sonnet | 60       | Read, Grep, Glob       | INVEST Story 분할, 이슈 타입 판정               | split, pipeline         |
| **estimator** | opus   | 80       | Read, Grep, Glob       | 3뷰 분해, PERT 추정, 일정 배치 (컨텍스트 heavy) | estimate, pipeline      |

- engineer(opus, AST 도구)는 제거. estimator가 heavy 에이전트 슬롯을 대체하되 **코드베이스가 아닌 기획서**를 소비한다.
- 에이전트 이름은 bare name — 스킬은 `subagent_type: "imbas:<agent>"`로 spawn.
- 역할 분리 근거 유지: 검증(비판)과 분할(창조)의 분리(analyst/planner), 추산은 양쪽과 이해관계가 없는 제3 관점(estimator).

## 스킬 ↔ MCP 매트릭스

| 스킬        | run                     | manifest       | config   | settings      |
| ----------- | ----------------------- | -------------- | -------- | ------------- |
| setup       | —                       | —              | get, set | open_settings |
| refine      | create, get, transition | —              | get      | —             |
| estimate    | get, transition         | save, validate | get      | —             |
| split       | get, transition         | save, validate | get      | —             |
| scaffold-pr | —                       | —              | get      | —             |
| digest      | get                     | —              | get      | —             |
| status      | get, list               | —              | —        | —             |
| pipeline    | create, get, transition | save, validate | get      | —             |
| read-issue  | get                     | —              | get      | —             |
