# maencof Health Check Tasks

2026-04-13 건강 점검에서 발견된 이슈. 번호 순서대로 실행 권장.

| # | File | Effort | Type |
|---|------|--------|------|
| 01 | [fix-insight-default-doc](01-fix-insight-default-doc.md) | 1min | doc fix |
| 02 | [add-agents-to-plugin-json](02-add-agents-to-plugin-json.md) | 1min | config fix |
| 03 | [unify-checkup-agent-name](03-unify-checkup-agent-name.md) | 10min | naming, decision required |
| 04 | [add-configurator-to-agent-role](04-add-configurator-to-agent-role.md) | 5min | type fix |
| 05 | [resolve-knowledge-connector-ghost](05-resolve-knowledge-connector-ghost.md) | 15min | decision required |
| 06 | [design-feedback-learning-loop](06-design-feedback-learning-loop.md) | large | feedback loop 전체 구현 (A-E) |
| 07 | [reduce-hook-context-noise](07-reduce-hook-context-noise.md) | 30min | optimization |

## Usage

각 태스크를 Claude에게 전달하여 실행:

```
이 태스크 실행해줘: packages/maencof/.tasks/01-fix-insight-default-doc.md
```
