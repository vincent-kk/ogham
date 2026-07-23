# EVAL-FIXUP — 구현 평가 발견 수정 (2026-07-23)

> **출처**: seiri 구현 평가 — 검증자 3(배선·규칙·스킬) + 직접 확인(manifest·규모·헌법·역할경계·filid) + SessionStart 훅 실측 6시나리오. 발견 7건 중 수정 대상 5건.
> **브랜치**: `feature/97-98`. **커밋 대기 (사용자 지시 시)** — AI는 `src/`·`skills/`·문서만 커밋 대상, `bridge/`·`public/`은 사용자.
> **이 문서는 작업 완료·머지 후 제거** (TODO·RULE-REVIEW와 같은 작업문서 규약).

발견 4건은 한 뿌리 — seiri가 "드리프트를 기계로 막는다"를 정체성으로 삼았으나 자기 저장소의 **검사 경계 바로 바깥**엔 가드를 안 걸었다(vault: 자기적용의-사각지대는-검사-경계-바로-바깥에-생긴다). 트랙 1은 그 마지막 한 겹을 닫는 일.

## 상태: 트랙 1 완료 (⑤ 일부 보류) · 검증 게이트 전부 통과

범례: ⬜ todo · 🔄 doing · ✅ done · ⏸ 보류

## 작업 리스트

| #   | 발견                             | 우선 | 방법                                        | 상태                                                |
| --- | -------------------------------- | ---- | ------------------------------------------- | --------------------------------------------------- |
| ①   | `03-RULES.md` S2 source 드리프트 | 높음 | fence 2곳 백포트(shipped와 일치)            | ✅ 03-RULES S2 == shipped **IDENTICAL** · hash 최신 |
| ②   | 문서 스킬 4→11                   | 중   | INTENT는 정본 가리킴 · README×2는 11종 나열 | ✅                                                  |
| ③   | rule-lint B1·B5·B6 존재검사 부재 | 중   | `ruleInvariants.test.ts` 3 it (B5 3형태)    | ✅ 54 tests · **fail-first 확인**                   |
| ④   | `projectHash` dangling comment   | 낮   | `findRepoRoot.ts` 주석 정리(의도 보존)      | ✅                                                  |
| ⑤   | 표기 통일                        | 낮   | `user-invocable` 11 · execute hand off      | ✅ user-invocable 11/11 · ⏸ execute hand off(아래)  |

## 검증 게이트 — 전부 통과

- ✅ `yarn seiri test:run` — **54 passed** (기존 51 + B1·B5·B6 3)
- ✅ **fail-first** — naming의 B1·B5·B6 훼손 시 3 it red 확인 → `git checkout` 복원 → 54 green
- ✅ `yarn seiri typecheck` — exit 0
- ✅ `sync-rule-hashes --check` — manifest up to date (shipped 규칙 불변, templateHash 불변)
- ✅ `03-RULES.md` S2 fence == `templates/rules/seiri_public-contract.md` — **diff 0** (재추출해도 롤백 없음)
- ✅ `prettier --check` — 편집 파일 전부 clean

## 수정 파일

| 파일                                                 | 발견               |
| ---------------------------------------------------- | ------------------ |
| `.metadata/seiri/03-RULES.md`                        | ①                  |
| `plugins/seiri/INTENT.md`                            | ②⑤                 |
| `plugins/seiri/README.md` · `README-ko_kr.md`        | ②                  |
| `plugins/seiri/src/core/utils/findRepoRoot.ts`       | ④                  |
| `plugins/seiri/src/__tests__/ruleInvariants.test.ts` | ③                  |
| `plugins/seiri/skills/*/SKILL.md` ×11                | ⑤ (user-invocable) |

## 잔여 / 후속

### 이번에 보류한 것 (판단 필요)

- **⑤ execute "hand off" 표기** — Rules 마지막 불릿에 녹아 있어 의미는 제안형으로 성립(`execute:48`). 다른 스킬의 별도 `Hand off:` 라인과 형식만 다름. 통일은 취향이라 보류.
- **② 재발방지 서술 가드** — INTENT는 정본(`SHIPPED_SKILLS`) 가리킴으로 **근본 해결**. README(사용자용)의 스킬 목록 ↔ `SHIPPED_SKILLS` 일치 테스트는 미작성. 만들면 README 드리프트도 기계로 잡힘 — 검토 대상.

### ① 재발방지 구조 (사용자 결정)

- **(a) 백포트** ✅ 완료 — 즉시 위험 제거.
- **(b) 추출 스크립트 + `--check`** — `03-RULES.md` fence → `templates/rules/` 결정적 추출을 스크립트화(현재 스크립트 파일 부재). CI에서 `--check`로 source↔shipped 드리프트를 red로. **근본 재발방지.**
- **(c) 정본 재정의** — `templates/rules/`를 규칙 전문의 정본으로, `03-RULES.md`는 판정노트(설계근거)만 보유. fence 중복 자체를 제거.
- → (b)/(c) 미결. (a)로 현 위험은 제거됨.

### 트랙 2 — 하니스/외부 의존 (평가 리포트 §5, 이번 범위 밖)

D7 디스패치 발화율 · 10이슈 A/B · `/context` 실로드 · S9 대조군(cennad) · 통합 검증(머지 게이트) · D9 규칙 분량 슬리밍. 전부 실하니스 필요. **트랙 1 완료로 선행 조건 충족.**

## 진행 로그

- **2026-07-23**: 트랙 1 착수 → ①②③④ 완료, ⑤ user-invocable 완료(execute hand off 보류). 검증 게이트 전부 통과. **커밋 대기(사용자 지시).**
