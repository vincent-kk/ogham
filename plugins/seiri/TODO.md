# TODO — 게이트 원장 (04-GATES)

> 작업 문서. 설계 정본은 `../../.metadata/seiri/04-GATES.md` — 여기엔 **순서와 완료 기준**만 있다. 전부 끝나면 이 파일은 지운다.

각 항목의 완료 기준은 원장 §10의 AC를 가리킨다. 순서는 의존 관계다 — 앞 항목이 뒤 항목의 입력이다.

## 1. core — `src/core/gates/`

- [ ] 파서: 게이트(`- [ ]`/`- [x]` · id · CHECK · EXPECT · EVIDENCE) · `ABANDON` · `##` 헤딩 묶음 · `Plan:` 머리줄. 파서는 하나이고 훅·MCP가 같은 것을 쓴다(원장 §2).
- [ ] 작업 디렉토리 열거: `.seiri/tasks/*/gates.md` — 없으면 빈 목록, 절대 throw 하지 않음.
- [ ] `status` 계산: met / unmet / abandoned / `all_met`. 체크됐지만 `pending`은 unmet (AC-claim-is-not-proof).
- [ ] 원장 줄 단위 쓰기: 박스 플립 · EVIDENCE 교체 · 되돌림(`pending (regressed)`) · `ABANDON` 줄 추가. 파일 재생성 금지 — 줄만 바꾼다.
- [ ] 증거 발췌: EXPECT 매치 줄 + 마지막 비어 있지 않은 줄, 200자, exit≠0 매치는 `(exit N)` 표기.
- [ ] EXPECT 판정: 부분문자열 / `/regex/` / 없으면 exit 0.
- [ ] 명령 일치: `hashCommand`의 공백 정규화 동치를 재사용.
- [ ] `gates.lock`(mkdir test-and-set, 양방향 fail-open, 시한 뒤 회수) — `session-signals.lock`과 동형.
- [ ] 훅 번들이 배럴 없이 organ을 직접 import할 수 있게 얇게 — `build:hooks` 바이트 캡 확인.
- [ ] 테스트: 포맷 전 경로 — 통과 · 실패 · 정규식 · EXPECT 없음 · 수동 게이트 · ABANDON · 되돌림 · 체크됐지만 pending · 여러 작업에 같은 CHECK · 락 경쟁(AC-gates-concurrency는 `bridge/` 번들 대상).

## 2. constants

- [ ] `toolNames.ts`에 `GATES: 'gates'` — 주석의 "Two, and that is the budget"을 3으로.
- [ ] `files.ts`에 `TASKS_DIR = 'tasks'` · `PLAN_FILE` · `GATES_FILE` · `GATES_LOCK_DIR`. `UNTRACKED_CONFIG_FILES`에 `tasks/` 추가 — 작업 디렉토리 전체 비추적 (AC-no-state-outside-ledger).
- [ ] 판정 줄·환기 줄 문구는 `constants/`에 — 훅 본문엔 선택·주입만(기존 관례).

## 3. MCP — `src/mcp/tools/gates/`

- [ ] `status(task?, project_root?)` · `abandon(task, gate_id, reason)` · `record(task, gate_id, evidence)` — 원장 §5. `status` 출력에 `met_by_agent` 목록. `record`는 CHECK 있는 게이트 거부, `abandon`은 사유 없으면 거부 (AC-no-execution · AC-abandon-visible).
- [ ] 작업 이름 검증: `^[a-z0-9]+(?:-[a-z0-9]+)*$`. 경로 탈출 금지.
- [ ] 서버 등록 · `.describe()`에 "언제 쓰지 말아야 하는지"(세션 훅 금지 · 테스트 실행은 Bash로).
- [ ] `tools/gates/INTENT.md` · `DETAIL.md`. `tools/INTENT.md`의 "도구 수는 2로 불변" · `DETAIL.md`의 "도구는 둘뿐" · AC-tool-surface-fixed를 3으로 개정.
- [ ] `wiring.test.ts` — 등록 도구 정확히 3개.

## 4. 훅 — `postToolUse`

- [ ] 게이팅: 다이얼 → `.seiri/tasks/` 부재·빈 디렉토리면 반환 → 명령 대조 → 일치 없으면 기존 실패 연쇄 경로.
- [ ] 판정 5경우(원장 §6) · 여러 작업 일치 시 전부 기록 + 한 줄에 이름 전부 · 되돌림 · 실패 연쇄 합류(임계 호출의 판정 줄이 힌트를 품음) · `is_interrupt` 제외.
- [ ] PostToolUse(exit 0)는 `tool_response.stdout/stderr`, PostToolUseFailure는 `error`만 — unobservable 판정과 처방 문구.
- [ ] 한 호출에 한 줄 (AC-verdict-never-silent). 실패 시 무주입 fail-open.
- [ ] `agent_id`가 있는 호출: 같은 규칙으로 기록하되 EVIDENCE에 `(via agent <id8>)` 표지 · 판정 줄 변형(`met via agent … — driver re-run clears the marker`) · `agent_id` 없는 호출이 덮어쓰면 표지 제거 (AC-evidence-provenance).
- [ ] 테스트: `failureChain.test.ts` 옆에 `gatesVerdict.test.ts` — 5경우 · 다중 작업 · advisory 침묵.

## 5. 훅 — `userPromptSubmit`

- [ ] 미충족 원장이 있을 때 한 줄(단일/복수 형태, 원장 §7). standard↑. 원장 파싱 실패는 환기만 생략(fail-open).
- [ ] `renderStatusLines.test.ts` · `workflowChain.test.ts` 갱신.

## 6. 스킬 개정 (원장 §8)

- [ ] `skills/execute/references/gates-format.md` — 포맷 스펙·작성 규칙·작업 디렉토리. 상시 비용 0.
- [ ] `write-plan` — 작업 이름 · `.seiri/tasks/<name>/plan.md` · 게이트 산출 · P2 위치 예외.
- [ ] `review-plan` — 게이트 품질 4항 · 위임 시 원장 인계.
- [ ] `execute` — `status`로 시작·재개 · 전망형 원장 · 게이트로 태스크 닫기 · 위임 반환 시 재실행 · `all_met` · `abandon`.
- [ ] `verify` — CHECK가 증명 명령 · UNMET → `/seiri:execute` 뒷가장자리 · 숫자 재측정.
- [ ] `request-review` — 원장 N of N + ABANDON.
- [ ] `finish` — 전체 `status` 선행 · 정리는 권하되 하지 않음.
- [ ] `WORKFLOW_STATE_LINES['verify']`에 뒷가장자리 문구 반영 여부 결정(현재 "→ request-review"만).
- [ ] `size.test.ts`(≤4,096B) · `skillPolicy.test.ts` 통과.

## 7. 명명 충돌 (원장 §13)

- [ ] `templates/gates/` → `templates/scaffolds/`. `setup` 스킬·`templates/INTENT.md`·02-ARCHITECTURE 레이아웃의 참조 갱신.

## 8. 문서 현행화

- [ ] `02-ARCHITECTURE.md` — §4 "3번째 도구는 만들지 않습니다" 제거 · 상태 3종 → 4종(작업 상태) · 훅 역할 표(PostToolUse 판정 · UserPromptSubmit 환기) · §3 체이닝에 verify→execute 뒷가장자리 · §2 레이아웃에 `src/core/gates/`·`tools/gates/` · 규모 목표 "현 3".
- [ ] `README.md`(`.metadata/seiri`) 구성 표 "MCP 도구 2" → 3. `plugins/seiri/README.md`·`README-ko_kr.md`·`INTENT.md`(MCP ≤3 · 훅 번들 5 유지).
- [ ] `plugins/seiri/DETAIL.md` — AC-tool-surface-fixed 개정 · Skill posture 갱신 · History 한 줄.

## 9. 측정 (원장 §11)

- [ ] `phase0/compliance-scan.mjs`에 원장 존재 · done-claim 전 `all_met` · ABANDON 보고 항목.
- [x] 실측 완료 (2026-08-22, Claude Code 2.1.239) — 발화함 · `session_id` 동일 · 서브에이전트 페이로드에만 `agent_id`·`agent_type`. 결과: `../../.metadata/seiri/phase0/subagent-hook-payload-2026-08-22.md`. 원장 §4·§6·§10 반영.

## 10. 마무리

- [ ] `yarn build` → `bridge/`·`public/` 커밋 대상 확인 · `yarn test:run` · `yarn typecheck`.
- [ ] 지식 저장소 설계 원장(`code-rules-plugin-design-ledger`) 현행화 · 작업 문서(`seiri-unlazy-import-review`) 소멸.
- [ ] 이 파일 삭제.
