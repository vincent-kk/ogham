# BUG REPORT — DETAIL.md에 INTENT.md 50줄 cap이 잘못 적용되는 카스케이드 결함

- **Reporter**: Vincent K. Kelvin (lunox298@gmail.com)
- **Reported**: 2026-05-28
- **Severity**: medium (정확성 결함 — 가짜 PASS/WARN 신호가 review 산출물에 전파, 차단 결과는 아님)
- **Detected via**: `/filid:pipeline` 실행 중 (`vincent-kk/albatrion` PR #318)
- **Status**: open

## 1. Summary

`filid:pipeline` Phase A의 `qa-reviewer` 페르소나가 **INTENT.md 전용 50줄 hard limit**을
DETAIL.md에 잘못 확장 적용한다. 잘못된 판정은 Phase C verification → Phase D persona vote →
`review-report.md` → PR 코멘트까지 무비판적으로 카스케이드된다.
LOW 위원회 구성(`engineering-architect` + `operations-sre`)에서는 문서 규칙 전문 페르소나
(`knowledge-manager`)가 빠져 있어 검증 단계에서 오류가 잡히지 않는다.

## 2. Authoritative Definition (영향 없음)

`packages/filid/`의 권위 있는 정의는 정확히 INTENT/DETAIL을 구분한다.

| 파일                                                                  | 진술                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 사용자 룰북 `albatrion/.claude/rules/filid_fca-policy.md` § INTENT.md | "Hard limit: **50 lines**"                                                 |
| 같은 파일 § DETAIL.md                                                 | "MUST NOT grow append-only. Each update MUST restructure." (cap 언급 없음) |
| `bridge/pre-tool-use.mjs`                                             | 50줄 검증(`O=50`)은 `T(o)` 가드 — `k(t)==="INTENT.md"`인 경우에만          |
| 같은 파일                                                             | DETAIL.md(`R(t)`)는 append-only(`bt(e,t)`) 검사만 수행                     |
| `agents/knowledge-manager.md:23-24, 32, 37`                           | INTENT/DETAIL 위반 항목 별도 분리                                          |
| `agents/context-manager.md:28, 54-55`                                 | "Keep every INTENT.md under 50 lines" / "NEVER grow DETAIL.md append-only" |
| `agents/adjudicator.md:39`                                            | "INTENT.md 50 lines, 3-tier, DETAIL.md non-append"                         |
| `src/hooks/INTENT.md:14`                                              | "INTENT.md 50줄·DETAIL.md append-only 블록"                                |

→ 권위 정의 자체는 정확. 결함은 정의의 **전달 경로**에 있다.

## 3. Ambiguous Statements in filid Documentation (1차 카스케이드 소스)

| 위치                                            | 잘못된 표현                                                              | 정정 제안                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `src/core/DETAIL.md:9`                          | `INTENT.md/DETAIL.md의 50줄 제한과 3-tier 경계 섹션을 검증해야 한다`     | `INTENT.md의 50줄 제한 및 3-tier 섹션과 DETAIL.md의 append-only 금지를 검증해야 한다`    |
| `src/core/rules/document-validator/INTENT.md:1` | `# document-validator -- INTENT.md/DETAIL.md 유효성 검증 (50줄 제한 등)` | `# document-validator -- INTENT.md(50줄 제한) / DETAIL.md(append-only 금지) 유효성 검증` |
| 같은 파일 :5                                    | `INTENT.md/DETAIL.md 유효성 검증 (50줄 제한 등).`                        | 위와 동일                                                                                |
| `INTENT.md:38`                                  | `INTENT.md / DETAIL.md 50줄 cap 자체의 수정 (cap 위반은 모듈 분리 신호)` | `INTENT.md 50줄 cap 자체의 수정`                                                         |

이 표현들이 LLM 페르소나의 멘탈 모델에 "INTENT/DETAIL 둘 다 50줄 cap"이라는
가짜 패턴을 심을 위험이 있다.

## 4. Persona Coverage Gap (2차 카스케이드 소스)

| 페르소나                      | 현재 정의                               | 문제                                       |
| ----------------------------- | --------------------------------------- | ------------------------------------------ |
| `filid:qa-reviewer`           | 정확한 INTENT/DETAIL cap 구분 인용 없음 | Phase A 구조 검사에서 자체 휴리스틱에 의존 |
| `filid:engineering-architect` | 동일                                    | Phase D에서 Phase A 출력을 무비판 인용     |
| `filid:operations-sre`        | 동일                                    | 위와 동일                                  |

대조군 — 정확하게 구분하는 페르소나: `knowledge-manager`, `context-manager`, `adjudicator`.

LOW complexity 위원회 구성 (`engineering-architect` + `operations-sre`)에서는 `knowledge-manager`가
포함되지 않아 문서 규칙 검증이 사실상 누락된다.

## 5. Reproduction

PR #318 (`vincent-kk/albatrion`, branch `fix/schema-form-oneOf`) 실행 시점에 다음이 관측됨:

1. `filid:pipeline` 자동 진입 → Phase A 서브에이전트(`general-purpose` → `Skill("filid:review", "--scope=pr --pipeline-mode=abc-only")`).
2. Phase A `qa-reviewer`가 `BranchStrategy/DETAIL.md` (신규 50줄)에 대해 다음을 출력:
   - `structure-check.md` Stage 2: `"DETAIL.md 신규 50줄 ... 임계(>50) 미초과 → PASS. (관찰: 40-50줄 LOW 경계에 해당하므로 향후 항목 추가 시 분할 필요)"`
   - 같은 파일 Medium/Low: `"INTENT/DETAIL <50줄 권고 | 50줄(한계점)"`
3. Phase C verification (`verification-metrics.md` + `verification-structure.md`)이 이 판정을 그대로 통과시킴.
4. Phase D 두 페르소나가 `verification.md`를 인용 → `review-report.md` Observations에 `"DETAIL.md가 50줄 한계점에 도달 — 다음 변경 시 섹션 분할 검토"` 기록.
5. PR 코멘트(#issuecomment-4556353171)에 동일 문구 게시 → 사용자 지적 후 정정.

정정된 산출물 위치: `.filid/review/fix--schema-form-oneOf/` 내 `structure-check.md`,
`review-report.md`, PR 코멘트는 모두 패치 완료.

## 6. Recommended Fixes

### Priority 1 — Persona Definitions (1차 원인 차단)

`packages/filid/agents/qa-reviewer.md` (및 `engineering-architect.md`, `operations-sre.md`)의
구조/문서 규칙 인용부에 다음 골자를 추가:

> Document cap rules: INTENT.md has a 50-line hard limit (enforced by `pre-tool-use` hook).
> DETAIL.md has **no line cap** — only append-only growth is forbidden, and each update must
> restructure. Do NOT extend INTENT.md cap rules to DETAIL.md.

### Priority 2 — Pipeline Coverage

LOW complexity 위원회에서도 문서 변경(`INTENT.md`/`DETAIL.md` 신규/수정)이 있을 경우
`knowledge-manager` 페르소나를 위원회에 자동 추가하도록 `mcp_t_review_manage(elect-committee)`
선출 로직 보강. 또는 Phase A `qa-reviewer`가 문서 규칙 위반 판정 시 반드시 출처 규칙
파일 경로(`filid_fca-policy.md` § 해당 섹션)를 인용하도록 시스템 프롬프트 강제.

### Priority 3 — Ambiguous Doc Strings

§3의 4개 위치 표현 정정 (PR 1건으로 일괄 처리 가능).

### Priority 4 — Verification Symmetry

`mcp_t_doc_compress` / `verification.md`의 INTENT/DETAIL 라인 카운트 보고 시
"DETAIL은 cap 미적용" 명시 라벨을 부착하여 다운스트림 페르소나의 오해 방지.

## 7. Out of Scope / Not Bugs

- DETAIL.md의 append-only 금지 규칙 자체는 정상 작동.
- INTENT.md 50줄 hard limit은 `pre-tool-use` hook에서 정확히 차단됨 (관찰됨).
- Phase D 합의 절차 자체에는 결함 없음 — 입력 데이터가 오염되었을 뿐.

## 8. Acceptance Criteria for Fix

- [ ] `qa-reviewer` 페르소나가 DETAIL.md에 줄 수 cap을 적용하지 않는다 (회귀 테스트로 검증).
- [ ] §3의 4개 모호 표현이 분리 명시 형태로 정정된다.
- [ ] LOW 위원회 + 문서 변경 시나리오에서 `knowledge-manager`가 자동 포함된다.
- [ ] `verification.md`의 문서 메트릭 보고에 cap 적용 여부 라벨이 포함된다.
