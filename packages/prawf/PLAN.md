# prawf 개발 PLAN — 핸드오프

> **이 문서 하나로 새 세션에서 prawf 플러그인 개발을 시작·완료할 수 있도록 구성한 핸드오프다.**
> 순서: §2 설계 SSoT를 먼저 읽고 → §4 Phase 0부터 §5까지 순차 진행 → §6 규칙 준수 → §7 검증.
> 설계 명세(한국어 SSoT)는 `.metadata/prawf/` 에 있고 **변경 금지**(영문 구현체만 이 패키지에 만든다).

## 1. prawf란

논문 **동료평가(peer review) 멀티에이전트** claude-code 플러그인. 9인 페르소나가 _공격(soundness 6축)
→ 방어(저자 변호인) → 중재(편집장)_ 로 논문을 해체하고, **다각 평가 + 예상 질문/해결책**을 산출한다.
문제가 없으면 **PASS(Accept) 판정**도 낸다. 평가는 세션 내 native Team(`TeamCreate`/`Task`)으로 돌고,
외부 검색은 capability 위임(특정 도구 미의존). **순수 마크다운 플러그인 — MCP·hook·빌드·런타임 의존성 0.**

## 2. 설계 SSoT — 먼저 읽을 것 (`.metadata/prawf/`, 순서대로)

| #   | 파일                  | 역할                                               | 이식                                                    |
| --- | --------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| 1   | `co-review-report.md` | 평가 이론 원자료(5축 + 8장 실무)                   | 참고용(이식 X)                                          |
| 2   | `note.md`             | 5축 요약                                           | 참고용                                                  |
| 3   | `personas.md`         | **9인 + adjudicator 정의**                         | → `agents/*.md`                                         |
| 4   | `orchestration.md`    | **파이프라인·상태머신·산출물 계약**                | → `skills/review/orchestration.md` + `SKILL.md`         |
| 5   | `field-profiles.md`   | **분야 프로파일 스키마·데이터**                    | → `skills/review/field-profiles.md` + `profiles/*.yaml` |
| 6   | `templates.md`        | 산출물 포맷                                        | → `skills/review/templates.md`                          |
| 7   | `prompt-templates.md` | spawn 프롬프트                                     | → `skills/review/prompt-templates.md`                   |
| 8   | `scaffold.md`         | **패키지 구조 확정**(디렉토리·skill·MCP/hook 결정) | 본 PLAN의 근거                                          |

참고 구조: filid `packages/filid/skills/review/` 가 가장 가까운 선례(단 prawf는 정적분석 인프라 제거).

## 3. 확정 결정 로그 (왜 이렇게 되었나 — 재논의 금지선)

- **페르소나 9인**: soundness 공격 6(`argument-analyst`·`methodologist`·`statistical-auditor`·`causal-reviewer`·`bias-grader`·`integrity-auditor`) + `impact-assessor`(advisory) + `rebuttal-strategist`(방어) + `chair`(중재). `--solo` 전용 `adjudicator` 1.
- **soundness-only verdict**: verdict는 soundness 6축 UNRESOLVED만 집계. `impact`는 advisory(Minor 이상 못 올림). — gemini/critic 외부 검증 근거.
- **3 skill**: `review`(메인) · `simulate-defense` · `rebuttal`. setup/profile skill 제거.
- **프로파일 내용 기반 자동 판정**: review P0가 논문 내용으로 분야·프로파일 추론. `--profile <name>` override 선택. **config 파일 불요**.
- **MCP 0 · hook 0**: 평가는 추론(분석 도구 없음), 시행 규칙 없음. 순수 마크다운. (근거: `scaffold.md` §6·§7)
- **영문 구현 / 한국어 설계 SSoT 분리**: `.metadata/prawf/`(한국어) ↔ `packages/prawf/`(영문).
- **2회 독립 검증(critic×2 + gemini) 반영 완료**: severity 루브릭·canonical locator·dedup·WITHDRAWN 확인·tie-break·significance 분리 등 P0/P1 봉합됨. 상태머신/계약은 `orchestration.md` 가 최종.

## 4. Phase 0 — 명세 정리 (MCP/setup/config 잔재 제거)

영문 이식 **전에**, MCP·setup·config 전제를 자동 판정 모델로 정리한다(이식 시 잔재가 따라가지 않도록).
아래는 grep으로 확인된 정확한 위치다.

### 4.1 `field-profiles.md`

- 헤더 `L1` 제목 `(config 주입)` → `(분야 프로파일 데이터)`.
- `L5–6` "MCP setup(또는 CLAUDE.md / `.prawf/config.json`)으로 config 형태로 공급", "MCP는 config 주입용" → "review P0가 자동 판정에 사용하는 분야 데이터"로 교체. MCP 문구 삭제.
- `L21` 스키마 주석 "(또는 MCP setup이 주입하는 JSON)" → 삭제.
- `§5 주입 메커니즘 (L186–201)` **전면 교체**:
  - 삭제: `CLI > .prawf/config.json(default_profile) > CLAUDE.md > 자동 > 폴백`, "MCP setup 웹 UI", "atlassian setup 대응".
  - 신규 우선순위: ① `--profile <name>` override(선택) → ② **P0 자동 판정(기본)** → ③ 보편 폴백 → ④ (선택) `.prawf/profiles/<name>.yaml` 커스텀.

### 4.2 `orchestration.md`

- 헤더 `L9` "MCP(채택 시)는 그 config 주입 전용이다" → 삭제(또는 "MCP·hook 없음 — 순수 마크다운").
- P0 `L40` "우선순위: CLI > `.prawf/config` > CLAUDE.md > 자동 > 폴백" → "`--profile` override > **자동 판정(기본)** > 보편 폴백 > (선택) 커스텀 yaml".

### 4.3 `personas.md`

- `L11` "config 주입한다" → "프로파일 데이터로 주입한다"(MCP 연상 어휘만 조정).

### 4.4 hook/MCP 산출물 — 애초에 만들지 않음

- `src/`·`bridge/`·`scripts/`·`.mcp.json`·`hooks/` **디렉토리 생성 금지**.
- `plugin.json` 에 `mcpServers` 키 없음. `package.json` 에 빌드 scripts·런타임 deps 없음.

**완료 기준**: `grep -rn "MCP\|config.json\|.prawf/config\|CLI >" .metadata/prawf/{field-profiles,orchestration,personas}.md` → **잔재 0**.

## 5. Phase 1–5 — 패키지 전개

### Phase 1 — 골격

- `package.json`: name `@ogham/prawf`, `type: module`, `files: [agents, skills, .claude-plugin, README.md]`, scripts는 `version:sync`(루트 `scripts/inject-version.mjs`)만, **deps 0**, `exports`/`main`/`dist` 없음.
- `.claude-plugin/plugin.json`: `name: prawf`, `skills: ./skills/`, **`mcpServers` 없음**, **`agents` 필드 없음**(규칙 §6).
- 루트 `INTENT.md`(≤50줄)·`DETAIL.md`·`CLAUDE.md` (영문). filid 루트 INTENT/CLAUDE 구조 미러링.
- **완료**: `/filid:setup` 후 `/filid:scan` 통과(골격 위반 0), `validate-plugin` 기본 통과.

### Phase 2 — agents ×10 (영문)

- `personas.md` 9인 + `adjudicator` → `agents/<id>.md`.
- 구조: filid agent 미러링 — `Role / Expertise / Decision Criteria / Evidence Sources / Hard Rules / Skill Participation`.
- frontmatter: `name`(= persona id), `description`, `tools: Read, Write, Glob, Grep`(+ 외부검색 capability는 본문 규칙으로), `model`(soundness=sonnet, chair/adjudicator=opus 권장).
- Hard Rules: `Write`는 자기 산출물(`findings/`·`rebuttal.md` 등)에만, location은 `paper-normalized.md` 좌표, 외부도구는 capability 위임.
- **완료**: 10개 frontmatter valid, `subagent-constructor` 검증 통과.

### Phase 3 — `skills/review/`

- `SKILL.md`: P0~ADJ 워크플로우 엔트리. filid `review/SKILL.md` 의 **anti-yield 3-layer 패턴**(Tier-2a) 복제 — 라운드 사이 yield 금지. `--solo`/`--profile`/`--scope` 옵션.
- `orchestration.md`·`field-profiles.md`·`templates.md`·`prompt-templates.md` 영문 이식(Phase 0 정리 반영).
- `profiles/*.yaml` ×4: `natural-science`·`cs-ml`·`math-theory`·`humanities-qualitative` (`field-profiles.md` 데이터 그대로).
- `INTENT.md`·`DETAIL.md`.
- **완료**: SKILL.md frontmatter valid, 명세 cross-ref 일관(persona id·산출물 파일명), `validate-plugin` 통과.

### Phase 4 — `skills/simulate-defense/` · `skills/rebuttal/`

- 각 `SKILL.md` (+ `INTENT.md`·`DETAIL.md`). review의 agents·오케스트레이션 재사용.
- `simulate-defense`: `qa-sheet`(또는 논문) → 심사위원 에이전트 질문 → 저자(사용자) 답변 → 평가·코칭. **대화형이면** filid Tier-2b escape-hatch 패턴 적용(§8).
- `rebuttal`: 논문 + 외부 리뷰 코멘트 입력 → R1 생략, **R2 방어부터** → `rebuttal-letter.md` + `revision-checklist.md`.
- **완료**: frontmatter·트리거 description(`"동료평가"`/`"peer review"`/`"답변 시뮬레이션"`/`"반박문"`) valid.

### Phase 5 — 배포 메타

- `README.md`(영문) + `README-ko_kr.md`(한국어). **버전 숫자 쓰지 말 것**(규칙 §6).
- 루트 `.claude-plugin/marketplace.json` 에 prawf 등록(다른 패키지 항목 참고).
- npm 게시 시 `.npmrc`(`min-release-age=7`) 루트+패키지.
- **완료**: marketplace 등록, `validate-plugin` 최종 통과.

## 6. 구현 규칙 (반드시 준수 — 프로젝트 메모리 피드백 반영)

- **영문**: `SKILL.md`·`agents/*.md`·`CLAUDE.md` 는 영문. (설계 SSoT `.metadata/prawf/` 는 한국어 유지.)
- **네이밍 축약 금지**: `simulate-defense`(O) / `defense-sim`(X). 식별자는 전체 단어로.
- **`plugin.json` 에 `agents` 필드 넣지 말 것**.
- **문서는 현재 스펙만**: DETAIL/INTENT/SKILL/agent에 "Last Updated"·버전 노트·plan 섹션 참조·commit id 금지(그건 git log 몫).
- **LLM 실행 skill은 in-context 값 사용**: 시스템 프롬프트 디렉티브로, 불필요한 filesystem read 지양.
- **README**: 버전 숫자 금지, 영문/`README-ko_kr.md` 파일 분리(한 파일에 혼용 X).
- **FCA**: `INTENT.md` 50줄 hard cap·3-tier boundary(Always/Ask first/Never), `DETAIL.md` 동반, 테스트 작성 시 3+12 rule.
- **동적 스크립트 실행 금지**: `python -c`/`node -e`/heredoc 금지 — 커밋된 `.mjs` 를 `node` 로.

## 7. 검증

- 단계별: `validate-plugin`(플러그인 정합성), `subagent-constructor`(agents), `skill-constructor`(skills).
- FCA dogfooding: `/filid:setup` → `/filid:scan` (prawf 자체를 fractal로 관리).
- cross-ref: persona id(10) · 산출물 파일명(`paper-normalized`·`review-report`·`qa-sheet`·`rebuttal`·`round-1/3`)이 SKILL·orchestration·prompt-templates·agents에서 일관(`scaffold.md` §8).
- 최종: `validate-plugin` 전체 통과 + marketplace 등록 확인.

## 8. 주의 · 미해결

- **자동 판정 오판**: P0가 분야를 잘못 고르면 부적합 프로파일. 안전망 = 보편 폴백 + `--profile` override. SKILL.md에 "확신 없으면 보편 폴백" 규칙 명시.
- **paper-normalized 줄번호 비결정성**: chair가 세션 내 생성 — 재실행 시 좌표가 달라질 수 있음. 현재는 수용(MCP 미도입 결정). 세션 내 일관성은 보장됨.
- **`simulate-defense` 대화형 여부**: 심사위원↔저자 turn이 인터랙티브면 yield 지점 발생 → filid Tier-2b escape-hatch(`<!-- [INTERACTIVE] -->` 마커) 적용. 비대화형(일괄 시뮬레이션)이면 Tier-2a.
- **9인 team 토큰 비용**: FULL 패널은 비쌈. LIGHT/STANDARD 소집(`orchestration.md` 패널 표)으로 조절. SKILL.md 기본은 자동 규모 판정.
- **버전**: prawf는 `src/version.ts` 없음(MCP 없음) → `version:sync` 는 `package.json` → `plugin.json` 만 동기화. 루트 `scripts/inject-version.mjs` 동작 확인 필요(version.ts 미존재 시 plugin.json만).
