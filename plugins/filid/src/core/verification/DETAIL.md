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
- 같은 최고 confidence의 adapter가 한 파일을 주장하면
  `ambiguous-adapter-claim` 진단을 남기고 해당 파일을 policy 분석에서
  제외한다.
- snapshot이 제공한 discovery 결과는 절대 portable path로 정규화해 한 번만
  소비하며, 동일 adapter의 중복 path는 한 claim으로 취급한다.
- discovery 실패나 adapter 경합으로 일부 파일을 판정하지 못하면 project
  certainty는 `indeterminate`이며 빈 exact 분석으로 축소하지 않는다.

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
- 동률 adapter가 주장한 파일은 첫 adapter가 임의로 소유하지 않는다.
- 같은 파일의 상대/절대 표기와 중복 discovery는 소유권 판정을 바꾸지 않는다.
- snapshot discovery는 adapter마다 한 번만 실행된다.

### AC-verification-contracts — Multiple specs

- 서로 다른 실제 DETAIL group에 연결된 spec은 통과한다.
- 겹치는 group은 `spec-fragmentation`, 누락되거나 존재하지 않는 group은
  `spec-contract-link` violation이다.

## Last Updated

2026-07-27 — portable path claim과 단일 discovery의 불확실성을 보존했다.
