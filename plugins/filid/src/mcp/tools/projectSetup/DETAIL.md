# project_setup — Filid 1.0 Contract

## Requirements

- `init`, `rules-status`, `rules-manifest`, `rules-sync`, `settings` action만 허용한다.
- action별 기존 도구의 summary, data, diagnostics와 status 의미를 보존한다.
- rules action은 project path를 요구하고, init과 settings는 생략 시 enclosing repository root를 사용한다.
- project source는 수정하지 않으며 config와 managed rule 문서는 각 child 계약이 허용한 범위에서만 쓴다.

## API Contracts

| Action | Input | Delegation | Payload |
| --- | --- | --- | --- |
| `init` | `path?`, `language?`, `adapterIds?` | project initialization child | created/config path summary |
| `rules-status` | `path` | rule-doc status child | action/count summary + raw data |
| `rules-manifest` | `path` | rule-doc manifest child | action/count summary + raw data |
| `rules-sync` | `path`, `selections?`, `resync?` | rule-doc sync child | action/change-count summary + raw data |
| `settings` | `path?`, `waitSeconds?` | settings-session child | saved/closed/pending summary |

## Acceptance Criteria

### AC-project-setup-dispatch — action별 단일 위임

- 각 action은 정확히 한 child entry point 또는 handler를 호출한다.
- rules action은 각각 `status`, `manifest`, `sync`로 한 번만 매핑된다.

### AC-project-setup-payload — 기존 payload 보존

- action을 제외한 입력과 child 결과가 기존 setup 도구 계약과 동일하다.
- settings action은 host abort signal을 그대로 전달한다.

## Last Updated

2026-09-05
