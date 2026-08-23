# lint — Contract

## Requirements

- 모든 검사는 `PluginFacts`를 읽기만 하고 `Diagnostic[]`을 반환하며 입력 facts, 생성물, 디스크 상태를 변경하지 않는다.
- 진단은 생성 중단 조건이 아닌 `warning`으로 보고하며 종료 여부는 호출자에게 맡긴다.
- Codex 이벤트와 matcher 호환성 판단은 어댑터와 같은 capability 선언을 소비해 변환과 진단이 어긋나지 않게 한다.
- hook 설정이나 matcher가 없으면 해당 검사는 진단 없이 완료한다.

## API Contracts

- `lintHookEvents(facts: PluginFacts): Diagnostic[]`는 Codex 지원 집합 밖의 hook event마다 `codex-unknown-event` 경고를 반환하고 facts를 변경하지 않는다.
- `lintHookMatchers(facts: PluginFacts): Diagnostic[]`는 PreToolUse와 PostToolUse matcher를 `|`로 분리한 exact token으로 판정한다.
- exact `Read` token은 `codex-read-matcher`를 반환하며 단순 셸 읽기의 `Bash` fallback과 복합 읽기 미추적을 알린다.
- exact `Skill` token은 `codex-unsupported-tool-matcher`를 반환하며 Codex 생성물에서 해당 token이 제거됨을 알린다.
- 진단 메시지는 plugin 이름, event, 원래 matcher 등 문제를 식별하는 문맥을 보존한다.

## Acceptance Criteria

### AC-lint-unknown-event — 지원하지 않는 event 진단

- 지원 event에는 진단하지 않고 지원 집합 밖의 event마다 `codex-unknown-event` 경고 하나를 반환한다.
- hook 설정이 없으면 빈 진단 배열을 반환한다.

### AC-lint-matcher-capabilities — matcher 호환성 진단

- 대상 event의 `Read|Skill` matcher는 `codex-read-matcher`와 `codex-unsupported-tool-matcher`를 모두 반환한다.
- matcher가 없거나 exact token이 일치하지 않으면 해당 경고를 반환하지 않는다.

### AC-lint-read-only — 읽기 전용 진단

- 모든 검사는 입력 facts와 생성물을 변경하지 않고 디스크 I/O 없이 완료한다.
- 경고가 있어도 이 모듈 자체는 생성을 중단하지 않는다.

## Last Updated

2026-08-23 — Codex hook event와 matcher 호환성 진단의 현재 계약을 기록했다.
