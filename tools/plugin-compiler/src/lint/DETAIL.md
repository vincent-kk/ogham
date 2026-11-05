# lint — Contract

## Requirements

- 모든 검사는 `PluginFacts`를 읽기만 하고 `Diagnostic[]`을 반환하며 입력 facts, 생성물, 디스크 상태를 변경하지 않는다.
- Existing hook capability diagnostics remain warnings. Explicit MCP opt-in validation reports generation errors; the pipeline owns whether files may be emitted.
- Codex 이벤트와 matcher 호환성 판단은 어댑터와 같은 capability 선언을 소비해 변환과 진단이 어긋나지 않게 한다.
- hook 설정이나 matcher가 없으면 해당 검사는 진단 없이 완료한다.

## API Contracts

- 진단 메시지는 plugin 이름, event, 원래 matcher 등 문제를 식별하는 문맥을 보존한다.
- MCP reference validation uses the adapters entry-point validator and converts its typed errors to error diagnostics. Unmarked plugins receive no new diagnostic.

## Acceptance Criteria

### AC-lint-read-only — 읽기 전용 진단

- 경고가 있어도 이 모듈 자체는 생성을 중단하지 않는다.

## Last Updated

호환성 진단의 수준·코드 또는 생성 중단 책임의 범위가 바뀔 때 갱신한다.
