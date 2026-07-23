# TODO — seiri 개발 작업 문서

> ⚠️ **이 문서는 개발 완료 후 제거됩니다.** 원장으로 보관되는 것은 [README.md](./README.md) · [01-CONSTITUTION.md](./01-CONSTITUTION.md) · [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) · [03-RULES.md](./03-RULES.md) 넷입니다. **원장에는 확정 설계만, 작업 항목은 전부 이 문서에 모읍니다** — 누락 방지가 이 문서의 존재 이유입니다.

관련 이슈: [#97 seiri 구현](https://github.com/vincent-kk/ogham/issues/97) · [#98 filid 슬리밍](https://github.com/vincent-kk/ogham/issues/98)

---

# 세션 재개 — 여기부터 읽으세요

**2026-07-24 기준. 브랜치 `feature/97-98`.**

**코어 개발(#97·#98 원안)은 완료됐습니다** — 빌드·MCP·설정 UI·훅·스킬 11종(sp 대체)·규칙 8종·filid 슬리밍(fca-policy 단독 잔류)·통합 검증(구조적 머지 안전)·D7 프록시 실측(33/35)·10이슈 A/B·D9 lite 슬리밍까지. 완료 절은 이 문서에서 들어냈습니다 — 기록은 원장 4서 · [phase0/](./phase0/) · git 이력에 있습니다(`git log --format='%h %s' main..HEAD` — SHA는 rebase로 바뀌므로 제목 줄이 안정 식별자).

**2026-07-24 — 확장 트랙 신설 (사용자 결정)**: seiri 확장 검토(omc·ponytail 패턴 조사 → 원장 정합 검토 → 사용자 확정)를 거쳐 **선제 배선 원칙**과 D5 재개 · D10~D14를 확정했습니다. 원장 반영 완료(01 P4 · 02 §1~§5). 현재 작업은 아래 [확장 트랙](#확장-트랙-2026-07-24--다이얼-배선--선제-훅--조건부-규칙)입니다.

## 지금 상태

|            |                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 동작       | `yarn seiri build` green · 설정 페이지 배포/해제 왕복 · 스킬 11종(각 ≤2KB) · 규칙 8종               |
| 테스트     | `yarn seiri test:run` **54 green** (07-24) · e2e 5 pass · filid 회귀 1182 passed / 7 skipped        |
| 훅         | 등록 1(SessionStart) + dormant 1(InstructionsLoaded) → **확장 트랙에서 등록 3 + dormant 1**         |
| MCP        | 도구 2(open_settings · rule_docs_sync) → **config action 추가 예정 (도구 수 불변)**                 |
| 규칙       | 8종 등재(권장 S1·S3·S4) · D9 lite 4종 채택(상시 -13%) · S9는 대조군 통과 후                         |
| 커밋 규약  | AI는 `src/`·`skills/`·문서만 커밋 — `bridge/`·`public/` 빌드 산출물은 **사용자가 직접 커밋**        |

## 재개 시 알아야 할 함정 5가지

1. **포매팅은 매 턴 끝에 훅이 돌립니다** (`.claude/settings.json` 의 Stop 훅 → `prettier --write --ignore-unknown`). 커밋 전에 같은 명령을 직접 돌려야 커밋과 포매팅 결과가 어긋나지 않습니다.
2. **훅이 저장소 루트에서 실행되므로 무시 규칙도 루트 `.prettierignore` 만 참조됩니다.** 패키지 레벨 `.prettierignore` 는 효력이 없습니다. 규칙 템플릿 보호(`plugins/*/templates/rules/`)가 루트에 들어가 있는 이유입니다 — 포매팅되면 `templateHash` 가 무효화되어 모든 사용자에게 거짓 드리프트가 뜹니다.
3. **훅 도달 코드는 배럴 import 금지**입니다. concrete 파일 직접 import 만. typecheck 는 못 잡고 `scripts/build-hooks.mjs` 의 캡·금칙 가드만 잡습니다. 훅 소스를 고쳤으면 반드시 `yarn seiri build:plugin`.
4. **번들 금칙 정규식은 미니파이 후에도 살아남는 문자열이어야 합니다.** 패키지 이름은 번들링이 지웁니다 (`env-paths` 대신 `XDG_CONFIG_HOME` 을 매칭하는 이유).
5. **경로는 `@ogham/cross-platform/compat` 경유**, 네이티브 `node:path` 금지. `hostPaths` 는 MCP 전용이고 **훅에서 소비 금지**입니다 (호스트가 훅에 `CLAUDE_PLUGIN_ROOT` 와 cwd 를 직접 줍니다).

**테스트 규율**: 기존 54건은 전부 **일부러 깨뜨려 red 를 확인**한 것들입니다. 새 테스트도 같은 절차를 밟습니다 — 실패를 본 적 없는 테스트는 아무것도 증명하지 않습니다.

---

# 확장 트랙 (2026-07-24) — 다이얼 배선 · 선제 훅 · 조건부 규칙

## 결정 — 선제 배선 원칙 (전문)

> **결정(사용자, 2026-07-24)**: D7 프록시·10이슈 A/B가 검증한 것은 **소컨텍스트 정합까지**다(신선한 세션, 단발 유혹 시나리오). 신규 배선이 겨냥하는 **대컨텍스트·다유혹 조건**(긴 세션, 컴팩션 후, 연쇄 실패 중, 서브에이전트 위임)은 미측정이고, 그 실측은 긴 메인 세션이 필요해 비용이 금지적이다. 따라서 이 조건을 겨냥한 배선은 **실측을 기다리지 않고 선제 적용**하되, **전부 다이얼로 게이팅**한다 — advisory = 신규 주입 전부 침묵(= D7이 검증한 현행 상태), 불용 판단 시 다이얼을 낮추는 것이 opt-out이다. 훅 지연 비용은 수용 가능 판정.
>
> Phase 0 원칙("측정 없이 짓지 않는다")과의 관계: 그 원칙은 micro-test가 저렴한 **규칙 본문**에 적용된다. 측정 비용이 금지적인 영역은 **선제 + 밸브 + 사후 관측**으로 간다 — 측정 가능성이 원칙의 적용 범위를 가른다.

설계 전문은 원장: [01-CONSTITUTION.md](./01-CONSTITUTION.md) P4(다이얼 4축·2계층) · [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) §4(훅 4종·config action·다이얼 절) · §5(조건부 로드).

## 작업 순서

| #   | 작업                                                    | 결정      | 규모 | 신규 테스트 |
| --- | ------------------------------------------------------- | --------- | ---- | ----------- |
| 1   | ✅ 원장 기록 (01 P4 · 02 §1~§5) + 이 문서 재작성        | —         | M    | —           |
| 2   | config action — 다이얼 조회 · 런타임 set/clear          | D11 · D14 | S    | ~4          |
| 3   | 다이얼 3축 완성 — 렌더 발동 폭 + setup 게이트 권유      | D10       | S    | ~4          |
| 4   | PostToolUse(Bash) 훅 — 실패 연쇄 → trace-cause 신호     | D13       | M    | ~6          |
| 5   | SubagentStart 훅 + execute·request-review 위임 문장     | D12       | M    | ~3          |
| 6   | S3 조건부 로드 — frontmatter 템플릿 포함 + 스모크       | D5 재개   | S    | ~1          |
| 7   | 전체 회귀 — build · test · lint · typecheck · 해시      | —         | S    | —           |

순서 근거: 문서 먼저(이 커밋) → 밸브의 조작 손잡이(2)가 훅(4·5)보다 먼저 — "낮추면 된다"가 성립하려면 낮추는 경로가 먼저 있어야 합니다.

## 2. D11·D14 — config action + 2계층 저장

- [ ] `configLoader`에 런타임 로더 추가 — 유효값 해석 `runtime ?? config ?? advisory`. 손상된 `runtime.json`은 기준선 폴백 + 경고(기존 `loadConfig` 무예외 계약과 동일)
- [ ] `writeRuntime` / `clearRuntime` — `writeAtomically` 경유. **최초 생성 시 `.seiri/.gitignore`(내용 `runtime.json` 한 줄) 동반 생성** (idempotent — 이미 있으면 무시)
- [ ] `rule_docs_sync`에 `config` action: 조회(기준선·런타임·유효값·출처) / `set`(런타임 쓰기) / `clear`(런타임 해제 → 기준선 복귀)
- [ ] set/clear 응답에 새 유효 다이얼과 활성 자세 1줄 포함 — **도구 결과 자체가 세션 컨텍스트 주입**이 됩니다
- [ ] 기준선(`config.json`) 쓰기는 계속 setup 표면 전용 — action은 기준선을 건드리지 않음
- [ ] 테스트 ~4 (fail-first): 유효값 우선순위 · clear 폴백 · `.gitignore` 동반 생성 · 손상 runtime 폴백
- [ ] `src/mcp/tools/INTENT.md` 갱신(action 흡수 기록 — "도구 2개" 문구·3번째 도구 항목 정리) · `DETAIL.md` 계약 표 갱신

## 3. D10 — 다이얼 3축 완성

- [ ] `renderStatusLines`: **유효 다이얼** 사용 + 런타임 출처 표기 — `Intervention: advisory (runtime; baseline: standard)`
- [ ] standard: 규율 체인 1줄 — 예: `Workflow: implement → verify-done → request-review; failures → trace-cause.`
- [ ] strict: + 경계 순간 확대 · 완료 주장 계약 1줄 — 예: `Borderline moments included. Completion claims name their verification run first.`
- [ ] 렌더 총량 가드: 기본 ~5줄 · strict ≤8줄 (renderStatusLines 테스트로 고정)
- [ ] `setup` 스킬: 게이트 스캐폴드 권유의 다이얼 조건 1문장 (advisory 안 함 / standard 제안 / strict 적극). **현 2020B — 여유 28B뿐이라 본문 감축 병행 필수** (size 캡 2048B)
- [ ] 테스트 ~4 (fail-first): 다이얼별 라인 수 · 문구 존재 · advisory 무언급(D7 기준선 보존) · 출처 표기

## 4. D13 — PostToolUse(Bash) 실패 연쇄 신호

- [ ] **선행: 페이로드 실측** — Bash 실패 신호가 `tool_response` 어디에 오는지(exit code / is_error / stderr) 확인 후 판정 로직 확정. InstructionsLoaded 선례 — 문서 미확정 페이로드는 실측이 정본
- [ ] `hooks.json`에 PostToolUse(matcher `Bash`) 등록 + `bridge/post-tool-use.mjs` (build-hooks.mjs 엔트리 추가, ≤16KB, 배럴 import 금지 — 함정 3)
- [ ] 판정: 명령 정규화 해시 · 연속 실패 카운터 · **N=3** 도달 시 1줄 주입 · **명령당 세션 1회 dedup** · 성공 시 카운터 리셋
- [ ] 상태 파일: `.seiri/` 비추적 영역(예: `session-signals.json`, D14의 `.gitignore` 커버에 포함) · **session_id 키잉** + 이전 세션 잔재 정리
- [ ] 다이얼 게이팅: 유효 다이얼 advisory면 즉시 exit (카운터 미기록 — 상시 비용 최소화)
- [ ] 문구는 fail-first 인정형 — 예: `3rd identical failure — if this red is intended (fail-first), proceed; otherwise consider trace-cause before patching.` implement 규율(의도된 red)과 충돌하지 않아야 합니다
- [ ] fail-open: 파싱 실패·상태 파일 손상 시 무주입 `{ continue: true }` — 세션 차단 금지
- [ ] 테스트 ~6 (fail-first): 카운터 증가 · 성공 리셋 · N 도달 주입 · dedup · advisory 침묵 · 손상 폴백
- [ ] `hooks/INTENT.md` · `DETAIL.md` 갱신 (등록 훅 목록·세션 리포팅 계약)

## 5. D12 — SubagentStart 훅 + 위임 문장

- [ ] `hooks.json`에 SubagentStart(`*`) 등록 + `bridge/subagent-start.mjs`
- [ ] `renderStatusLines` 축약판 재사용(파라미터화) — advisory: Active rules 한 줄 / standard↑: + 체인 1줄. **규칙 본문 비복제 원칙 동일** (규칙 파일 위치만 가리킴 — 서브에이전트도 Read 가능)
- [ ] fail-open + stdin 타임아웃 — 서브에이전트 스폰을 막지 않을 것 (ponytail #443 교훈과 동일 계약)
- [ ] `execute` SKILL.md 위임 단계에 활성 규칙 재진술 1문장 (현 1913B — 여유 135B 내)
- [ ] `request-review` SKILL.md 동일 (현 1706B — 여유 342B 내)
- [ ] 테스트 ~3 (fail-first): 다이얼별 축약 렌더 · 배포 0건 무주입 · fail-open
- [ ] 근거 기록: 공식 문서 "필요 규칙은 위임 프롬프트에 재진술" + CLAUDE.md 미상속 보고(anthropics/claude-code#59309). SessionStart 컨텍스트는 부모 전용 — 규칙 파일의 서브에이전트 로드 여부는 사후 관측(아래 실하니스 잔여)

## 6. D5 재개 — S3 조건부 로드

- [ ] **스모크 1회**: 실환경 프로젝트 레벨에서 `globs:` vs `paths:` 조건부 로드 동작 확인 → 키 확정. 근거 충돌 해소용 — 02-ARCH §5 자체 실측(paths) vs 커뮤니티 불량 보고(#17204 따옴표/YAML 형식 · #22170 사용자 레벨)
- [ ] `templates/rules/seiri_test-validity.md`에 frontmatter 추가 — 테스트 파일 glob. **템플릿 자체에 포함**(배포 시 주입은 templateHash 붕괴)
- [ ] glob 값 선택 근거를 03-RULES.md S3 판정 노트에 기록 — glob은 불가피하게 "값"이므로(테스트 파일 위치 관례) 관례 폭을 넓게 잡은 이유를 남김
- [ ] `yarn seiri build` → sync-rule-hashes 재주입 (frontmatter 포함 해시)
- [ ] `ruleInvariants`: frontmatter 뒤 "첫 블록 Precedence" 검사 공존 확인 · 필요시 갱신 (fail-first)
- [ ] 설정 페이지 표시 영향 확인 — 조건부 배지는 v1 생략 가능
- [ ] `/context`로 조건부 로드 실측 (매칭 파일 읽기 전/후 — 세션 시작 시 미로드 · 테스트 파일 접근 후 로드)

## 7. 전체 회귀

- [ ] `yarn seiri build` — 해시 재주입 · 번들 캡 · 금칙 가드 통과
- [ ] `yarn seiri test:run` 전 green (기존 54 + 신규 ~17) · `yarn lint` · `yarn typecheck`
- [ ] `yarn filid test:run` 회귀 무영향 확인
- [ ] wiring 테스트: hooks.json 등록 3 + `DORMANT_HOOKS` 1 대조 갱신
- [ ] size 테스트: 스킬 11종 ≤2KB 재확인 (setup · execute · request-review 수정분)
- [ ] `bridge/` · `public/` 재생성 확인 — **커밋은 사용자 몫**

## 구현 노트 — 리스크 3

1. **fail-first 오발화 (D13)**: implement 규율이 의도된 red를 요구 → 카운터가 정상 red→green 루프를 물면 규율 충돌. 완화: N=3 + fail-first 인정 문구.
2. **페이로드 미확정 (D13)**: PostToolUse의 Bash 실패 신호 형태는 문서 미확정 — 첫 구현에서 실측 후 판정 로직 확정 (InstructionsLoaded 선례).
3. **rule-lint × frontmatter (D5)**: "첫 블록 Precedence" 검사가 frontmatter와 공존해야 — ruleInvariants 갱신은 fail-first로.

## 예산 개정 (2026-07-24)

| 항목      | 구        | 신                             | 반영처                                             |
| --------- | --------- | ------------------------------ | -------------------------------------------------- |
| 훅        | 2개       | **4개** (등록 3 + dormant 1)   | 02-ARCH §2 ✅ · plugin `INTENT.md`는 구현 커밋에서 |
| MCP 도구  | ≤3 (현 2) | 불변 — config는 action 흡수    | 02-ARCH §4 ✅                                      |
| 상시 주입 | ~5줄      | 기본 ~5줄 · **strict ≤8줄**    | 02-ARCH §2 ✅ · renderStatusLines 테스트로 고정    |

---

# 실하니스 잔여 (기존 이관 + 확장 사후 관측)

전부 로컬 설치 + 실사용 세션 의존 — 확장 트랙과 독립적으로 누적 관측합니다.

- [ ] **컴팩션 생존** (긴 메인 세션 필요) — 규칙 로드가 컴팩션을 넘는지 + **신규**: D12·D13 신호의 대컨텍스트 실효(선제 배선의 사후 관측). 필요시 InstructionsLoaded 재등록(dormant 복원 절차는 `src/hooks/instructionsLoaded/INTENT.md`)
- [ ] **서브에이전트 규칙 파일 도달 실측** — `.claude/rules/`가 서브에이전트 세션에 로드되는지 (D12 훅과 별개의 사실 확인 — transcript 관측, D7 프록시 하니스 재사용)
- [ ] **S9 `decision-trail` 대조군** (cennad 3표본) → 통과 시 manifest 등재 (D2)
- [ ] **D7 §8 메인세션 잔여**: implement·plan 발화 재확인 · 질문금지 집행 (AskUserQuestion 존재 환경 — 프록시의 집행 증명이 약했던 부분)
- [ ] `seiri:setup`의 filid 잔재 감지 (선택 — 파일명 패턴 검사만, 플러그인 간 결합 금지)
- [ ] `/filid:scan`으로 seiri 소스 FCA 구조 점검 (부수)

# 사용자 할 일

1. **`bridge/` · `public/` 커밋** — 07-24 현재 미커밋 (cennad·filid 산출물 변경분과 함께 워킹트리에 있음). 확장 트랙 구현 후 재빌드분도 동일 규약
2. **`agy` CLI 점검** — antigravity 2연속 "no output"으로 Phase 0 실험에서 제외됐던 건
3. **확장 트랙 완료 후 로컬 재설치** — 선제 배선의 사후 관측 시작점 (위 실하니스 잔여)

---

# 결정 대장

## 확정된 결정 (요약 — 상세 근거는 원장 · phase0/)

| #        | 결정                                                                    | 확정      |
| -------- | ----------------------------------------------------------------------- | --------- |
| D1       | 전부 opt-in · 권장 3종 S1(agent-legible)·S3(test-validity)·S4(reuse-first) | 07-23     |
| D2       | S9 편입 opt-in — 등재는 자체 대조군(3표본) 통과 후                      | 07-23     |
| D3       | 문구 강도(MUST/SHOULD) 조절 **폐지** — 이중 강도 문제 (헌법 P4 반영)    | 07-24     |
| D4       | 에이전트 0개                                                            | —         |
| D6       | 게이트 스캐폴드는 placeholder 골격만 (값 없음)                          | —         |
| D7       | 디스패치 베팅 — 프록시 승리 33/35(94%), 강압 부트스트랩 불요. 메인세션 §8 잔여 | 07-23~24  |
| D8       | S7·S8 ↔ 스킬 중복 — 규칙 무삭감 (원칙/절차 altitude 분리)               | 07-23     |
| D9       | 규칙 lite 4종 채택(상시 -13%) — 전면 슬리밍은 실하니스 후               | 07-24     |
| **원칙** | **선제 배선** — 대컨텍스트 겨냥 배선은 선제 + 다이얼 밸브 + 사후 관측   | **07-24** |
| **D5**   | **재개** — S3 조건부 로드 도입 (트리거: 강모델 순비용 2.8× 실측)        | **07-24** |
| **D10**  | 다이얼 3축 완성 — 발동 폭·게이트 권유 배선                              | **07-24** |
| **D11**  | config는 `rule_docs_sync` action 흡수 — 3번째 도구 없음                 | **07-24** |
| **D12**  | SubagentStart 상태 재주입 + 위임 재진술                                 | **07-24** |
| **D13**  | PostToolUse(Bash) 실패 연쇄 → trace-cause 신호                          | **07-24** |
| **D14**  | 다이얼 2계층 저장 — 기준선(커밋) / 런타임(비추적, `.seiri/.gitignore`)  | **07-24** |

## 구현 중 확정할 것

- [ ] D5 frontmatter 키 — `globs:` vs `paths:` (스모크 1회로)
- [ ] D13 실패 신호 페이로드 형태 (실측으로)

---

# 머지 시 정리

- [ ] 확장 트랙 1~7 완료 + 회귀 전 항목 통과
- [ ] 릴리스 노트에 마이그레이션 순서 명시: **`/seiri:setup` 먼저, `/filid:setup` 나중**
- [ ] 이 문서(`TODO.md`) 제거
- [ ] [03-RULES.md](./03-RULES.md) 상태표를 최종 확정본으로 갱신 (S3 조건부 포함)
- [ ] [README.md](./README.md) 현재 상태 절 갱신 (훅 4 · config action · 다이얼 2계층 반영)
- [ ] filid `.metadata` 문서에 위계 분담 상호 참조 추가
- [ ] 이슈 [#97](https://github.com/vincent-kk/ogham/issues/97) · [#98](https://github.com/vincent-kk/ogham/issues/98) 닫기 (같은 PR로 함께)
