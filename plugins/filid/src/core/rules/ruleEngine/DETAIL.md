# ruleEngine contract

## Requirements

- canonical 15개 built-in rule만 등록한다.
- node-level rule과 project-level rule을 각각 한 번의 적절한 granularity로
  평가한다.
- scope filter는 documents, nodes, entry-points, boundaries, dag,
  verification을 지원한다.
- rule exception과 indeterminate/unsupported evidence를 PASS로 숨기지 않는다.
- exception과 allowed-peer scope는 portable separator/case path identity로
  평가한다.
- `legacy-criteria-ledger`는 project granularity로 snapshot evidence를
  평가하고 root DETAIL migration target을 suggestion으로 반환한다.

## API Contracts

- `loadBuiltinRules(options?): Rule[]` — config-bound canonical rule roster.
- `evaluateRule(rule, context): RuleViolation[]` — 단일 rule 결과 또는
  indeterminate finding.
- `evaluateRules(snapshot, rules?, options?): RuleEvaluationResult` —
  scope/granularity에 맞춘 전체 결과.

## Acceptance Criteria

### AC-rules-roster — 정확한 15개

- retired naming/index-barrel rule이 없고 계획의 14개 구조/검증 ID와
  `legacy-criteria-ledger`가 모두 있다.

### AC-rules-evidence — 증거 기반 결과

- circular, boundary, entry surface와 verification rule이 snapshot evidence를
  직접 사용한다.
- check failure와 uncertain graph는 passed count에 들어가지 않는다.
- graph가 `indeterminate` 또는 `unsupported`이면 알려진 edge에 boundary
  위반이 없더라도 external-import-boundary가 uncertainty finding을 남긴다.
- pure-function node의 알려진 edge가 격리를 위반하지 않더라도 graph가
  exact가 아니면 pure-function-isolation이 uncertainty finding을 남긴다.
- legacy criteria evidence가 없으면 rule이 통과하고, 있으면 ledger path에서
  violation과 root DETAIL migration suggestion을 한 번 반환한다.

### AC-rules-granularity — 중복 없는 평가

- project rule finding은 tree node 수와 무관하게 한 번만 생성된다.

### AC-rules-portability — Host 독립 scope

- Windows target path는 POSIX separator로 작성된 literal/glob scope와
  동일하게 매치된다.

## Last Updated

2026-07-27 — legacy ledger migration을 포함한 snapshot-aware 15-rule 계약으로 갱신했다.
