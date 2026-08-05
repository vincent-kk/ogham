# @ogham/imbas

기획자 사이드 제품 개발 워크플로우를 위한 Claude Code 플러그인. 기획 문서를 재구조화·검증하고, manday와 일정을 추산하고, Jira / GitHub Issues / 로컬 마크다운에 잘 짜인 이슈로 분할·생성하며, 개발 인계용 draft PR 골격까지 만들어 준다.

> [English (README.md)](./README.md)

스펙을 쓰는 것은 쉽다. 그것을 방어 가능한 견적과 깔끔한 백로그로 바꾸는 일이 지루하고 실수하기 쉽다. imbas는 기획자 워크플로우를 전문 AI 에이전트가 이끄는 **3단계 파이프라인**으로 자동화하고, 개발이 시작되는 지점에서 의도적으로 멈춘다 — 코드 탐색도, 구현 계획도 하지 않는다.

```
기획 문서
  → refine    : 표준 구조로 재편 + 5종 정합성 검증
  → estimate  : 3뷰 WBS + PERT manday + 일정                    (선택)
  → split     : INVEST 분할 → 승인 → 이슈 생성
  → scaffold-pr : 이슈별 draft PR 골격                           (후처리)
```

---

## 설치

### 마켓플레이스 (권장)

```bash
# 1. 저장소를 마켓플레이스에 추가
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install imbas
```

모든 구성 요소(Skills, MCP, Agents)가 자동 등록된다. 수동 설정은 필요 없다.

### 개발 환경 (로컬)

```bash
# 모노레포 루트에서
yarn install
yarn workspace @ogham/imbas build
```

---

## 빠른 시작

```bash
# 1. 최초 1회 설정 — provider·프로젝트·라벨·언어·estimation 계수를 브라우저 폼에서
/imbas:setup

# 2. 기획 문서 재구조화·검증
/imbas:refine requirements.md

# 3. (선택) manday·일정 추산
/imbas:estimate

# 4. 이슈 분할·생성 (승인 게이트 포함)
/imbas:split

# …또는 전체 흐름을 한 명령으로
/imbas:pipeline requirements.md
```

---

## 스킬

| 스킬                 | Phase | 역할                                                                       |
| -------------------- | ----- | -------------------------------------------------------------------------- |
| `/imbas:setup`       | —     | 브라우저 설정 폼(provider·프로젝트·라벨·언어·모델·estimation) + 캐시 구축 |
| `/imbas:refine`      | 1     | 표준 8섹션 재구조화 + 5종 검증 게이트                                      |
| `/imbas:estimate`    | 2     | 3뷰 분해 → 단일 WBS → PERT manday → 팀 규모 일정 (선택 단계)               |
| `/imbas:split`       | 3     | INVEST 분할 → 승인 게이트 → 멱등 재개 지원 일괄 생성                       |
| `/imbas:scaffold-pr` | 후처리 | 이슈에서 draft PR 골격(브랜치·empty commit·체크리스트) 생성               |
| `/imbas:pipeline`    | 1–3   | 자동 승인 게이트와 blocker 리포트로 전체 흐름 실행                         |
| `/imbas:status`      | —     | 런 상태·산출물·재개 안내                                                   |
| `/imbas:digest`      | —     | 이슈 코멘트 스레드를 압축 요약해 게시                                      |
| `imbas:read-issue`   | —     | (내부) 이슈+스레드 맥락 구조화                                             |

## 에이전트

| 에이전트    | 모델   | 역할                                             |
| ----------- | ------ | ------------------------------------------------ |
| `analyst`   | sonnet | 5종 검증 + 문서 재구조화, 역추론 검증            |
| `planner`   | sonnet | INVEST 이슈 분할                                 |
| `estimator` | opus   | 컨텍스트 heavy 추산: 3뷰 WBS·PERT·일정           |

## 추산 (Estimation)

estimate 단계는 재구조화된 기획서만으로 "얼마나 걸리는가"에 답한다 — 코드베이스는 읽지 않는다:

- **3뷰 분해**(페이지/기능/모듈)와 교차 대조 — 한 관점의 사각지대를 다른 관점이 잡는다
- 설정 가능한 S/M/L/XL 기준값에 앵커된 **단위별 PERT** (`expected = (o + 4m + p) / 6`)
- 통합/테스트/PM 오버헤드와 버퍼를 얹은 **롤업** → 신뢰 구간이 붙은 총계
- `team_size` 병렬 트랙 **일정**과 마일스톤, mermaid gantt 리포트
- 문서가 답하지 않은 것은 전부 명시적 가정으로; σ가 큰 단위는 리스크로 자동 승격

계수는 `config.estimation`(user/project 계층)에 있으며 설정 폼에서 편집한다.

## Provider

| Provider | 이슈 생성 경로                                                   |
| -------- | ---------------------------------------------------------------- |
| `jira`   | 세션의 Atlassian 도구가 결의하는 `[OP:]` 시맨틱 오퍼레이션       |
| `github` | `gh` CLI                                                         |
| `local`  | `.imbas/<KEY>/issues/` 마크다운 파일                             |

imbas는 Atlassian 자격 증명·전송 계층을 소유하지 않는다 — Jira 오퍼레이션은 REST 의도만 기술하고 실행은 세션의 Atlassian 도구가 맡는다.

## 아키텍처 노트

- **Plan-then-execute** — 분할은 매니페스트를 쓰고, 승인 게이트 전에는 provider에 닿지 않는다
- **매니페스트 = 원장** — 항목별 `issue_ref`/`status`를 생성 즉시 저장해 재실행이 멱등하다
- **런 기반 상태** — 실행마다 `.imbas/<KEY>/runs/<id>/`, MCP 서버가 강제하는 결정론적 상태머신(`refine → estimate(skip 가능) → split`)
- **MCP 도구 9개** — 상태머신 4, 매니페스트 검증 2, 설정 계층 2, 설정 웹 UI 1; 산출물 파일은 Read/Write로 직접 다룬다
- **훅 없음** — 세션 라이프사이클에 아무것도 주입하지 않는다

설계 문서: [`.metadata/imbas/`](../../.metadata/imbas/README.md)

## 라이선스

MIT
