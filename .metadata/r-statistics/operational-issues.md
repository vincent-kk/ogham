# r-statistics — 운영/동작 이슈 (수정 필요 목록)

`.sample/` 5개 데이터셋 전체 분석(`analyze` 디스패처 파이프라인)을 실제로 한 바퀴 돌리면서
관측된 운영·동작 문제를 증거와 함께 정리한다. 각 항목은 **증상 → 증거 → 영향 → 원인(파일) →
수정 방향** 순. 심각도 내림차순. 통계 결과 자체는 정상 산출되었으며(검증기 5/5
`requiresStatisticianRevision: false`), 아래는 모두 **플러그인/인프라** 문제다.

검증 실행 환경: macOS / Rscript 4.6.1 / 플러그인 `r-statistics@ogham` 활성.

---

## ISSUE-1 (CRITICAL) — 서브에이전트가 자기 MCP 도구를 호출하지 못함 (이름 미해석)

### 증상

`statistician` / `r-expert` / `methodology-validator` 에이전트가 자신에게 grant된 MCP 도구
(`run_r`, `assert_analysis_plan` 등)를 세션에서 찾지 못한다.

### 증거 (이번 실행)

- 모든 `r-expert` 프로파일링 에이전트가 "MCP `tools` 서버가 세션에 등록되어 있지 않다"며
  직접 `Rscript --vanilla`로 **폴백**했다 (그 폴백이 SLOP-warning 훅까지 유발 — ISSUE-6).
- `statistician` / `methodology-validator`는 `assert_analysis_plan`을 호출하지 못해
  대신 `ruleset.ts` 소스를 읽고 게이트 판정을 "예측"했다.
- 디스패처(메인 스레드)에서는 동일 도구가 `mcp__plugin_r-statistics_tools__run_r` 로
  정상 호출됨 → 도구 자체는 살아있고, **이름 매칭만 실패**.

### 원인

- `.mcp.json` 서버명은 `tools`.
- 에이전트 frontmatter `tools:` grant는 `mcp_tools_run_r` / `mcp_tools_assert_analysis_plan`
  형태 (파일: `agents/r-expert.md:10-12`, `agents/statistician.md:9`,
  `agents/methodology-validator.md:9`).
- 그러나 플러그인으로 로드되면 Claude Code는 도구를 `mcp__plugin_<plugin>_<server>__<tool>`,
  즉 `mcp__plugin_r-statistics_tools__run_r` 로 네임스페이싱한다. grant 문자열과 불일치.

### 영향

3-레이어 아키텍처(에이전트가 `run_r` 소유, 디스패처가 게이트 enforce)가 **설치 환경에서
붕괴**한다. 실질적으로 디스패처만 MCP에 도달 가능하고, 결정적 실행계약(`contract.R`의
아티팩트/매니페스트)이 폴백으로 우회된다. SAP 산출/검증은 추론만으로 가능했으나,
데이터 프로파일링·본 실행은 에이전트가 수행하도록 설계된 부분이 깨진다.

### 수정 방향

1. 에이전트 `tools:` grant를 실제 노출 이름과 일치시킨다. 후보:
   - `mcp__plugin_r-statistics_tools__run_r` 처럼 정확 네임스페이스로 기입, 또는
   - 네임스페이스 와일드카드/접두 매칭이 가능하면 그것으로.
2. **선결 작업**: Claude Code가 _플러그인 설치 시_ 실제로 노출하는 도구 문자열을 1건
   확정 측정한 뒤(이번 세션 관측값 = `mcp__plugin_r-statistics_tools__<tool>`), 그 패턴으로
   `agents/*.md` grant + SKILL.md/문서의 `mcp_tools_*` 참조를 일괄 정렬.
3. 정렬 후 서브에이전트에서 `run_r`/`assert_analysis_plan` 1회 호출 회귀 테스트로 확인.

---

## ISSUE-2 (HIGH) — assert 게이트가 미등록 기법을 "무검증"으로 통과(`ok`)시킴

### 증상

`TECHNIQUE_RULES`에 없는 기법을 넣으면, 가정 아티팩트가 전부 `passed:false`라도 게이트가
`{allowed:true, severity:"ok", reasons:[]}` 를 반환한다. 즉 **클린 통과처럼 보이지만 실제로는
아무 검사도 하지 않은** 것.

### 증거 (이번 실행, 디스패처 직접 호출)

- `gam` + 아티팩트 5개 모두 `passed:false`(linearity / homoscedasticity /
  residual_normality / no_multicollinearity = false, independence=true)
  → 반환 `{"allowed":true,"severity":"ok","reasons":[]}`.
  동일 페이로드를 `linear_regression`으로 넣으면 `soft_warning`(4개 violation)이 나온다.
- `cmh` (Cochran–Mantel–Haenszel) → `ok`, 검사 0건. 카탈로그/룰셋에 미등록.

### 원인 (파일)

- `src/mcp/tools/assertAnalysisPlan/operations/evaluateSoftRules.ts`: `rule`이 `undefined`면
  즉시 `{reasons:[], recommendedAlternatives:[]}` early-return.
- `src/mcp/tools/assertAnalysisPlan/operations/evaluateHardRules.ts`: rule 없으면 outcome
  mismatch skip, EPV/group-size도 미발동.
- 룰셋: `src/mcp/tools/assertAnalysisPlan/operations/ruleset.ts` 의 `TECHNIQUE_RULES` 에
  `gam`/`spline_regression`/`cmh` 항목 부재.

### 영향

**시스템의 핵심 안전장치(결정적 하드 게이트)가 카탈로그 밖 기법에 대해 무력**하다. 가장 위험한
실패 양태: 오탈자 기법 id(`linear_mixed_model`↔`mixed_model`, `ancova`↔`linear_regression`)가
모든 가정검사를 조용히 우회하면서도 진짜 통과와 구분 불가능한 `ok`를 돌려준다. 이번엔
methodology-validator가 유일한 안전망이었다.

### 수정 방향 (가장 중요)

1. **미등록 기법을 별도 verdict로**: `TECHNIQUE_RULES[technique]`가 `undefined`이면 `ok`가 아니라
   `soft_warning` + 전용 사유(`unvalidated_technique` 등)를 반환. "게이팅되지 않았음"을 호출자가
   알 수 있게 한다. (단일 최우선 견고성 수정.)
2. 실제로 추천되는 기법을 등록: 최소 `gam`, `spline_regression`, `cmh`(mantelhaen).
   `meta.yaml` + 룰셋 항목 추가. (CLAUDE.md가 명시한 "ruleset.ts ↔ methods/{technique}/meta.yaml
   동기화"의 미싱 항목.)
3. 회귀 테스트: 등록 후 `gam` + 위반 아티팩트 → 적절한 경고가 나오는지 확인.

---

## ISSUE-3 (HIGH) — R 실행계약이 미설치 패키지에 하드 의존, 오해 소지 에러

### 증상

`read_data()` / `data_path()` / 아티팩트 매니페스트가 stock R 설치에서 동작하지 않는다.
실패 메시지가 원인을 가린다.

### 증거 (이번 실행)

- 패키지 점검 결과: `jsonlite`=FALSE, `data.table`=FALSE, `ggplot2`=FALSE (미설치).
- `read_data("bng")` → `Error: Unknown data ref: bng`. 실제 원인은 "id 오타"가 아니라
  **jsonlite 부재로 `data/refs.json`이 파싱되지 않아 ref 맵이 빈 것**.
- 우회: `Sys.getenv("R_STATISTICS_DATA_DIR")`의 CSV를 base `read.csv`로 직접 읽고,
  플롯은 base graphics `png()`로 생성 → 정상 동작.
- (정상 동작 확인) jsonlite 없어 매니페스트는 생략돼도 아티팩트 파일은 디렉터리 스캔으로
  수집됨 — PNG 3개 정상 수집. `finalize`의 graceful skip은 설계대로 작동.

### 원인 (파일: `shared/contract.R`)

- L27-29: `refs.json` 파싱이 `requireNamespace("jsonlite")` 게이트 → 없으면 `refs` 빈 list.
- L75: `read_data`의 csv 경로가 `data.table::fread`.
- L108-113: `save_plot_artifact`가 `ggplot2::ggsave`.

### 영향

의도된 데이터 접근 API와 매니페스트가 기본 R에서 비기능. `read_data`/`save_plot_artifact`를
쓰는 method 템플릿이 그대로면 실패한다. 또한 에러 문구가 디버깅을 오도한다.

### 수정 방향

1. 이 패키지들을 **선결 의존성으로 선언**하고 `r-setup`이 설치(jsonlite, data.table, ggplot2 +
   method별 패키지)하게 하거나,
2. 계약을 **base R로 graceful degrade**: refs를 base가 읽을 수 있는 포맷(예: 단순 CSV) 병행 기록
   또는 최소 파서, csv는 jsonlite/data.table 없을 때 `utils::read.csv` 폴백, `save_plot_artifact`는
   base graphics 폴백 또는 명시적 skip.
3. 에러 개선: refs.json은 있는데 jsonlite가 없어 비었으면
   `"refs.json present but jsonlite missing — cannot resolve data refs"` 로 명확화(`Unknown data ref` 대신).

---

## ISSUE-4 (MEDIUM) — 기법 id ↔ 통계학자 추천 매핑 모호 / 별칭 부재

### 증상

흔한 기법이 전용 id 없이 다른 id로 들어가야 하고, 그 사실이 문서화돼 있지 않다.

### 증거

- ANCOVA → 전용 `ancova` 없음, `linear_regression`으로 제출해야 함(통계학자가 직접 확인).
  단, `linear_regression` 룰셋은 ANCOVA 고유 가정인 **회귀기울기 동질성**을 검사하지 않음.
- LMM → `mixed_model` (있음). `linear_mixed_model` 같은 미등록 문자열은 ISSUE-2로 무검증 통과.
- CMH → `fisher_exact`는 있으나 `cmh`/`mantelhaen` 없음.

### 영향

기법 선택은 맞아도 id 매핑을 통계학자가 매번 소스에서 역추적해야 하고, 사소한 id 차이가
ISSUE-2의 무검증 통과로 직결된다.

### 수정 방향

- canonical 기법-id ↔ 방법 매핑 표를 통계학자 에이전트가 참조 가능한 위치에 명시.
- `ancova`를 별칭 또는 독립 항목으로 추가하되 회귀기울기 동질성 가정 포함.
- (ISSUE-2.1과 결합) 미등록 id는 loud-fail.

---

## ISSUE-5 (LOW/INFO) — r-setup이 R 패키지 환경을 점검·보강하지 않음

### 증상

흔히 필요한 패키지가 다수 부재라 방법이 환경에 의해 조용히 제약된다.

### 증거 (이번 실행에서 부재 확인)

`car`, `emmeans`, `effectsize`, `lme4`, `pscl`, `logistf`, `sandwich`, `lmtest`, `quantreg`,
`jsonlite`, `data.table`, `ggplot2` 미설치. 가용: `mgcv`, `nlme`, `MASS`, `survival`, `splines`.

이로 인한 실제 제약:

- `logistf` 부재 → 희귀사건 완전분리(categorical-rare-event, region=east 0/43)에 Firth 벌점
  로지스틱 적용 불가.
- `pscl` 부재 → 영과잉(skewed-zero-inflated-counts)에 형식적 ZINB/hurdle 적합 불가.
- `car` 부재 → Levene/VIF 수동 구현.
- `ggplot2` 부재 → 시각화 base graphics 대체.

### 수정 방향

`r-setup`(또는 doctor)이 권장 패키지 셋의 설치 여부를 점검하고 동의 하에 설치 제안. 그래야
방법 선택이 환경에 의해 말없이 좁혀지지 않는다.

---

## ISSUE-6 (INFO) — 폴백이 SLOP-warning 훅을 유발 (ISSUE-1의 증상)

### 증상/원인

ISSUE-1로 MCP 도구에 닿지 못한 `r-expert`가 직접 `Rscript`로 폴백하자
`[SLOP WARNING] fallback/workaround language` 훅이 트리거됨.

### 영향/수정

독립 버그 아님 — ISSUE-1을 고치면 폴백 자체가 불필요해져 사라진다. 별도 조치 불필요.

---

## 부록 — 정상 동작 확인 (참고)

- 디스패처에서 `mcp__plugin_r-statistics_tools__run_r` (sync/async), `get_r_job`,
  `assert_analysis_plan` 모두 정상.
- 게이트가 **등록된** 기법(`linear_regression`, `fisher_exact`, `mixed_model`,
  `negative_binomial`)에는 의도대로 판정.
- 아티팩트 디렉터리 스캔 수집(매니페스트 없이도) 정상 — PNG 3개 수집됨.
- 5개 데이터셋 모두 적합 기법으로 분석 완료, 검증기 전원 method 재선택 불요.
