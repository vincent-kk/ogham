# prawf 패키지 구조 설계 (확정)

> `packages/prawf/` 전체 구조 · skill 구성 · MCP/hook 검토. filid 골격 기반이되 **prawf 성격(멀티에이전트
> 평가 오케스트레이션)에 맞춰 정적분석 인프라를 들어낸 순수 마크다운 플러그인**. (코드 미작성 — 설계 명세.)
>
> **확정**: 4 skill · 프로파일 내용 기반 자동 판정 · MCP 0개 · hook 0개 · 명세는 `skills/peer-review/` 영문 이식.

## 1. 설계 철학 — filid와 prawf는 무게가 다르다

| 측면      | filid                                    | prawf                                  |
| --------- | ---------------------------------------- | -------------------------------------- |
| 본질      | **정적 분석 도구** (AST·rule 검증)       | **멀티에이전트 평가 오케스트레이션**   |
| 핵심      | MCP server(분석도구)·시행 hooks·AST 엔진 | claude-code native Team(9인)           |
| 동작      | MCP 도구 호출 + hook                     | 세션 내 Task spawn                     |
| 외부 의존 | `@ast-grep/napi` 등 런타임               | **없음** (외부 검색은 capability 위임) |
| 산출물    | 측정값·violation                         | 마크다운 리포트                        |

→ filid의 무거운 부분(src/TS·bridge·MCP 분석도구·시행 hooks·AST 의존성)은 **전부 불필요**.
prawf의 평가는 페르소나의 *추론*이지 결정적 측정이 아니다. filid에서 가져올 것은 **구조 골격**뿐이다.

### filid 취사

| filid 요소                                   | prawf     | 사유                                                            |
| -------------------------------------------- | --------- | --------------------------------------------------------------- |
| `.claude-plugin/plugin.json`                 | ✅ mirror | 플러그인 매니페스트                                             |
| `skills/` · `agents/`                        | ✅ mirror | 워크플로우 + 10인 페르소나                                      |
| `INTENT.md`/`DETAIL.md`/`CLAUDE.md`/`README` | ✅ mirror | FCA dogfooding + 가이드                                         |
| `src/`·`bridge/`·`scripts/`·`.mcp.json`      | ❌ drop   | MCP 0개 → 빌드 산출물 없음 (§6)                                 |
| `hooks/`·`@ast-grep/napi`                    | ❌ drop   | 시행 규칙 없음(§7)·분석 도구 없음                               |
| `templates/`                                 | ⚠️ 변형   | FCA 모듈 템플릿 대신 `skills/peer-review/profiles/` 분야 데이터 |

## 2. 디렉토리 구조 (확정 — 순수 마크다운)

```
packages/prawf/
├── .claude-plugin/
│   └── plugin.json                  # name, skills (mcpServers 없음)
├── agents/                          # 10인 — 영문 전개 (personas.md 기반)
│   ├── argument-analyst.md          # 축① 논증·연역
│   ├── methodologist.md             # 축② 절차·설계
│   ├── statistical-auditor.md       # 축③ 데이터·분석
│   ├── causal-reviewer.md           # 축④ 추론
│   ├── bias-grader.md               # 축⑤ 비뚤림·재현성
│   ├── integrity-auditor.md         # 축⑥ 진실성
│   ├── impact-assessor.md           # 축⑦ 파급력 (advisory)
│   ├── rebuttal-strategist.md       # 방어
│   ├── chair.md                     # 중재 (team lead 지침)
│   └── adjudicator.md               # --solo 통합 1패스
├── skills/
│   ├── INTENT.md
│   ├── peer-review/                 # ★ 메인 — 9인 team 평가
│   │   ├── SKILL.md                 # 워크플로우 엔트리
│   │   ├── INTENT.md · DETAIL.md
│   │   ├── orchestration.md         # 파이프라인·상태머신·계약 (영문 이식)
│   │   ├── field-profiles.md        # 프로파일 스키마·자동 판정
│   │   ├── templates.md             # 산출물 포맷
│   │   ├── prompt-templates.md      # spawn 프롬프트
│   │   └── profiles/                # 내장 분야 프로파일 데이터 (배포·읽기전용)
│   │       ├── empirical-science.yaml
│   │       ├── cs-ml.yaml
│   │       ├── math-theory.yaml
│   │       └── humanities-qualitative.yaml
│   ├── simulate-defense/            # ★ 보조 — 답변 시뮬레이션
│   │   └── SKILL.md (+ INTENT·DETAIL)
│   └── rebuttal/                    # ★ 보조 — 반박문 작성
│       └── SKILL.md (+ INTENT·DETAIL)
├── INTENT.md · DETAIL.md · CLAUDE.md · README.md (+ README-ko_kr.md)
└── package.json                     # version:sync(plugin.json 동기화)만, 빌드 없음
```

**package.json**: `src`/`dist`/`bridge`/`exports` 없음. `files: [agents, skills, .claude-plugin, README.md]`.
런타임 의존성 0. (`version:sync` 로 package.json → plugin.json 버전만 동기화.)

**사용자 프로젝트 측** (`.prawf/`, 런타임 생성·선택):

- 기본은 **설정 파일 불요** — peer-review가 논문 내용으로 프로파일을 자동 판정.
- 커스텀 분야가 필요할 때만 `.prawf/profiles/<name>.yaml` 을 사용자가 작성(또는 peer-review가 폴백 안내).

## 3. Skill 구성 — 4개 (+ 아이디에이션 3개)

| skill                  | 역할                                                                                           | 산출                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **`peer-review`**      | 9인 team 평가 (교차검증 메인). P0(자동 프로파일 판정)~ADJ                                      | `review-report.md` + `qa-sheet.md`             |
| **`simulate-defense`** | 답변 시뮬레이션 — 심사위원 에이전트 질문 → 저자 답변 → 평가·코칭                               | 모의 Q&A 세션 + 코칭                           |
| **`rebuttal`**         | 외부에서 받은 실제 리뷰 코멘트 → point-by-point 응답서 (R1 건너뛰고 R2 방어부터)               | `rebuttal-letter.md` + `revision-checklist.md` |
| **`auto-fix`**         | peer-review 후 자동수정 가능한 기계적·근거 기반 편집만 원고에 직접 적용 (나머지는 manual 목록) | `applied-fixes.md` + `manual-fixes.md`         |

- 프로파일: **내용 기반 자동 판정이 기본**. `--profile <name>` 인자는 override(선택). 별도 setup/profile skill 없음.
- `--solo`(adjudicator)는 `peer-review`의 옵션이지 별도 skill 아님.
- `simulate-defense`·`rebuttal` 은 peer-review의 **agents·오케스트레이션을 재사용**(strategist + 축 reviewer) — 구현 부담 작음.

### 아이디에이션 (추후 선택)

| skill            | 아이디어                                                      |
| ---------------- | ------------------------------------------------------------- |
| `pre-submission` | 제출 전 셀프 체크리스트 (peer-review의 lightweight 단일 패스) |
| `revise-guide`   | Major/Minor Revision verdict → 구체적 수정 로드맵             |
| `compare`        | 다중 논문 비교 평가 (학회 프로그램위원)                       |

## 4. Agents — 10개 (영문 전개)

`personas.md` 9인 + `adjudicator`. 각 `agents/<id>.md` 는 filid agent 구조
(`Role / Expertise / Decision Criteria / Evidence Sources / Hard Rules / Skill Participation`) 미러링.
**scoped tools**(Read·Write·Glob·Grep + 외부검색 capability), `Write` 는 자기 산출물 파일에만.

## 5. 프로파일 자동 판정 (config 없는 운영)

`field-profiles.md` 의 주입 우선순위를 **자동 판정 우선**으로 확정:

1. `--profile <name>` 인자 (명시 override) — 선택
2. **P0 자동 판정** (기본) — chair가 논문 유형·분야를 추론해 내장 프로파일 선택
3. 보편 폴백 — 내장에 없는 분야는 분야 무관 보편 메뉴 (`review-report` 에 "generic profile" 명시)
4. (선택) `.prawf/profiles/<name>.yaml` 커스텀 — 사용자가 작성한 경우만 후보에 추가

→ `.prawf/config.json` 없이 동작. 설정 파일은 커스텀 프로파일을 둘 때만 생긴다.

## 6. MCP 검토 — 결론: 0개

- **평가 로직**: 추론(페르소나 LLM)이지 결정적 측정이 아니다 — filid AST·메트릭 대응물 없음.
- **config 주입 UI**: 프로파일 자동 판정으로 가므로 주입 통로 불필요(setup/profile skill 제거와 함께 소멸).
- **paper-normalize**: chair가 세션 내 `paper-normalized.md`(공유 좌표계)로 충분. 평가의 비결정성 대비 줄번호 완벽 결정화는 과잉.
- **외부 검색**: capability 위임(미의존).

→ **MVP·정식판 모두 MCP 0개.** 미래에 줄번호 불일치가 실제 문제가 되거나 웹 대시보드 수요가 생기면 그때 도입.

## 7. Hook 검토 — 0개

- 트리거("논문 평가"/"peer review"/"동료평가")는 skill `description` 으로 충분.
- 시행할 코드 규칙 없음 (filid hooks의 FCA 시행에 대응하는 것 없음).
- SessionStart 상태 주입 불요.

→ `hooks/` 디렉토리 자체를 두지 않는다.

## 8. 명세 이식 — `skills/peer-review/` 영문 전개

`.metadata/prawf/` 의 한국어 설계 명세를 `skills/peer-review/` 로 **영문 이식**(filid 방식):

| `.metadata/prawf/` (한국어 설계) | → `packages/prawf/` (영문 구현)                            |
| -------------------------------- | ---------------------------------------------------------- |
| `personas.md`                    | `agents/<id>.md` ×10                                       |
| `orchestration.md`               | `skills/peer-review/orchestration.md` + `SKILL.md`         |
| `field-profiles.md`              | `skills/peer-review/field-profiles.md` + `profiles/*.yaml` |
| `templates.md`                   | `skills/peer-review/templates.md`                          |
| `prompt-templates.md`            | `skills/peer-review/prompt-templates.md`                   |
| `co-review-report.md`/`note.md`  | (출처 — 이식 안 함)                                        |

`.metadata/prawf/` 는 한국어 설계 SSoT로 보존, `packages/prawf/` 는 영문 구현체.

## 9. 전개 순서 (코드 작성 단계 — 다음)

1. `package.json` + `.claude-plugin/plugin.json` + 루트 `INTENT.md`/`DETAIL.md`/`CLAUDE.md`
2. `agents/*.md` ×10 (영문)
3. `skills/peer-review/` (SKILL.md + 명세 5종 영문 + profiles/\*.yaml)
4. `skills/simulate-defense/` · `skills/rebuttal/` · `skills/auto-fix/` (SKILL.md)
5. `README.md` (+ README-ko_kr.md) + marketplace.json 등록
