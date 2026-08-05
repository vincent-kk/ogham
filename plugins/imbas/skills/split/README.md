# split

imbas 파이프라인 Phase 3. 재구조화된 기획서를 INVEST 이슈로 분할하고, 승인 게이트를 거쳐 provider(Jira/GitHub/local)에 일괄 생성한다.

## 개요

`refined.md`를 `planner` 에이전트가 INVEST 기준으로 분할하고 3→1→2 검증(앵커 링크 → 정합성 → 역추론)과 크기 검사를 적용한다. 사용자가 매니페스트를 승인하면 같은 흐름에서 provider에 이슈·링크·전이를 생성한다. 항목별로 `issue_ref`/`status`를 즉시 기록해 중단 후 재실행이 안전하다(멱등·재개).

## 사용법

```
/imbas:split [--run <run-id>] [--epic <EPIC-KEY>] [--dry-run]

--run     : 기존 런 ID (생략 시 최근 적격 런)
--epic    : Epic 키 (생략 시 생성/선택 질문; jira·github 전용)
--dry-run : 분할·매니페스트 저장까지만 수행하고 생성 계획을 미리보기
```

## 흐름

1. **분할 (Step 1–7)** — 전제조건 확인(refine PASS + estimate 완료/skip), Epic 결정, planner 분할, 3→1→2 검증, 크기 검사(수평 분할·umbrella), 매니페스트 저장·검증
2. **승인 게이트 (Step 8)** — 실행 요약 제시, 사용자 승인/수정/보류 결정
3. **생성 (Step 9–11)** — drift 점검, provider별 일괄 생성(항목별 저장), 라벨 적용, 결과 리포트

estimate가 pending이면 분할 전에 건너뛸지(skip_phases) 먼저 묻는다. `estimation.json`이 있으면 Story별 `estimate_manday`가 매겨져 이슈 본문에 병기된다.

## Provider

| provider | 생성 경로                                  |
| -------- | ------------------------------------------ |
| `jira`   | `[OP:]` 시맨틱 오퍼레이션 (세션 Atlassian) |
| `github` | gh CLI                                     |
| `local`  | `.imbas/<KEY>/issues/*.md` 마크다운        |

provider X로 실행 중일 때 다른 provider의 `references/` 문서는 읽지 않는다.

## 출력

- `stories-manifest.json` — 분할 결과이자 생성 원장 (`issue_ref`/`status`)
- provider 이슈 (Jira/GitHub/local)

## 참고 파일

- `references/preconditions.md` — 전제조건 + estimate skip 흐름
- `references/workflow.md` — 분할 워크플로우 (Step 1–7)
- `references/creation-workflow.md` — 생성 워크플로우 (Step 8–11)
- `references/escape-conditions.md` — 탈출 조건 (E2-x, EC-x)
- `references/label-transitions.md` — 라이프사이클 라벨 규칙
- `references/state-transitions.md` — 상태 전이와 출력
- `references/tools.md` — 사용 도구·에이전트
- `references/errors.md` — 에러 처리
- `references/{jira,github,local}/` — provider별 생성 상세
