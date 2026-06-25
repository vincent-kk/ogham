# r-statistics — 스킬

**원칙**: 스킬 = 노출되는 라우팅 인터페이스(`SKILL.md` description이 상시 컨텍스트 점유). "모듈 입도 ≠ 스킬 입도". 노출은 **6개**로 최소화, 기법별 로직은 lazy `methods/`로 격리. 스킬은 마크다운 only(소스코드 없음) — filid/imbas 패턴.

## SKILL.md frontmatter (filid/imbas 형식)
```yaml
---
name: <kebab-case>                    # 접두 없음 (plugin namespace 자동)
user_invocable: true
description: '[r-statistics:<skill>] <한 줄 목적>. Trigger: "<구1>", "<구2>"'
argument-hint: '[--auto] [--data PATH] ...'
version: '1.0.0'
complexity: simple|moderate|complex   # complex → Tier-2a anti-yield preamble
plugin: r-statistics
---
```

## 노출 스킬 6
| 스킬 | complexity | 역할 | 호출 에이전트 | MCP |
|------|-----------|------|--------------|-----|
| **analyze** | complex | 메인 오케스트레이터(Dispatcher): intent 분류→파이프라인→모드 | 3종 전부 | run_r, assert, get/cancel |
| **data-preparation** | moderate | 로드(fread/arrow)·프로파일·정제·결측 대치 | r-expert | run_r |
| **assumption-check** | moderate | 정규성·등분산·독립성 검정 → assert 입력 아티팩트 | r-expert | run_r |
| **visualization** | simple | ggplot2 디바이스 보일러플레이트 | r-expert | run_r |
| **reporting** | moderate | Table1·효과크기·다중비교 → Quarto(DOCX/HTML/PDF) | r-expert, validator | run_r |
| **r-setup** | simple | R 설치 확인 + 환경별 가이드 + 동의 기반 설치 | — | run_r(탐지) |

- partial-step(그래프만/가정검정만)은 `visualization`·`assumption-check`를 직접 호출.
- full-analysis는 `analyze`가 전체 오케스트레이션.

## analyze (오케스트레이터 = Dispatcher)
```
skills/analyze/
├── SKILL.md                  # Tier-2a preamble + intent 분류 + 파이프라인 진입
└── references/
    ├── state-machine.md      # 상태·전이표·iteration guard (→ dispatcher.md)
    ├── intent.md             # full/partial/troubleshoot/methodology 분류 휴리스틱
    ├── modes.md              # interactive(기본) / --auto
    └── methods/{technique}/  # 기법별 lazy 리소스
        ├── meta.yaml         # 가정·필수 아티팩트·severity 선언 (assert 연동)
        └── template.R.tmpl   # 코드 골격 (header/slot/footer)
```
- `--auto` 플래그는 analyze가 받아 모드 전환(Dispatcher 실행 플래그).
- progressive disclosure: SKILL.md는 얇게, 실행 시 `references/*` 와 `methods/{선택기법}/` 만 로드.

## methods/{technique}/ (lazy, 노출 X)
codex가 식별한 기법 로직(t_test·anova·mann_whitney·linear_regression·logistic·poisson·cox·mixed·chi_square·correlation…)을 여기에 배치. 각:
- `meta.yaml`: `{ technique, family, outcome_types, required_assumptions:[{id, severity:hard|soft}], required_artifacts, packages }` → `assert_analysis_plan`이 소비.
- `template.R.tmpl`: `[고정 header: set.seed·lib·ARTIFACTS_DIR]` + `[slot: 통계학자/R전문가 로직]` + `[고정 footer: ggsave·manifest.json·sessionInfo]`.

## shared/contract.R
모든 스킬이 주입하는 공통 R 실행계약 골격(header/footer 헬퍼). methods 템플릿이 `source()`. 19곳 복붙 방지.

## r-setup references
`references/{windows.md, macos.md, linux.md}` — OS별 설치 절차.
- Windows: `winget install RProject.R` / `choco install r.project`
- macOS: `brew install --cask r`
- Linux: 배포판별 가이드 (설치 실행은 가이드 우선)
- ⚠️ 설치 실행은 **동의 게이트** 필수(시스템 변경=비가역) + 알려진 패키지매니저 명령만. `run_r`과 분리 채널.

## Agent↔Skill 경계
- **Agent**: 기법/공변량/모수여부 선택 + 통계 본문 로직 (가변).
- **Skill**: 실행계약 골격·아티팩트 규약·OS 분기 (불변 보일러플레이트).
- slot은 파라미터 템플릿 우선 + guarded free-form + static forbidden-call 검증.
