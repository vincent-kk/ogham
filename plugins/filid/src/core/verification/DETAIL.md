# verification contract

## Requirements

- spec-document는 파일당 최대 15 semantic cases를 허용한다.
- test-record는 파일당 최대 32 semantic cases를 허용하며 전체 파일·case
  수에는 제한을 두지 않는다.
- exact count만 cap PASS/violation으로 판정하고 indeterminate와 unsupported는
  별도 warning finding으로 보존한다.
- 같은 owner fractal의 여러 spec-document는 실제 DETAIL acceptance group을
  선언하고 파일 간 group이 겹치지 않아야 한다.
- adapter가 역할, case count와 `filid:contract` marker를 해석한다.

## API Contracts

- `analyzeVerification(input): Promise<VerificationProjectAnalysis>` —
  adapter evidence를 file analysis와 policy violation으로 조합한다.
- `evaluateVerificationPolicy(files, contractGroups)` — 15/32와 spec 연결을
  평가한다.
- `findSpecFragmentation(files, contractGroups)` — 겹침, 누락과 알 수 없는
  group finding을 만든다.
- `resolveContractGroups(detailDocuments)` — DETAIL의 안정 acceptance group을
  owner별 index로 만든다.

## Acceptance Criteria

### AC-verification-caps — File role thresholds

- exact spec 15와 test-record 32는 통과한다.
- exact spec 16과 test-record 33은 각각 role-specific violation이다.
- 여러 test-record의 합계는 violation을 만들지 않는다.

### AC-verification-certainty — Unknown evidence

- 동적 table과 알 수 없는 syntax는 PASS가 아니라 indeterminate 또는
  unsupported finding이다.

### AC-verification-contracts — Multiple specs

- 서로 다른 실제 DETAIL group에 연결된 spec은 통과한다.
- 겹치는 group은 `spec-fragmentation`, 누락되거나 존재하지 않는 group은
  `spec-contract-link` violation이다.

## Last Updated

2026-07-26 — Filid 1.0의 15/32 verification-document 모델을 정의했다.
