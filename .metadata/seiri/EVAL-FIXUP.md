# EVAL-FIXUP — 구현 평가 발견 수정 (2026-07-23)

> **출처**: seiri 구현 평가 — 검증자 3(배선·규칙·스킬) + 직접 확인(manifest·규모·헌법·역할경계·filid) + SessionStart 훅 실측 6시나리오. 발견 7건 중 수정 대상 5건.
> **브랜치**: `feature/97-98`. 트랙 1 = 커밋 `97f54dd4`. **이 문서는 작업 완료·머지 후 제거** (TODO·RULE-REVIEW와 같은 작업문서 규약).

발견 4건은 한 뿌리 — seiri가 "드리프트를 기계로 막는다"를 정체성으로 삼았으나 자기 저장소의 **검사 경계 바로 바깥**엔 가드를 안 걸었다(vault: 자기적용의-사각지대는-검사-경계-바로-바깥에-생긴다). 트랙 1은 그 마지막 한 겹을 닫는 일.

## 상태: 트랙 1 완료 (커밋됨) · ① 근본 재발방지(c) 완료 (커밋 대기)

범례: ⬜ todo · 🔄 doing · ✅ done · ⏸ 보류

## 작업 리스트

| #   | 발견                             | 우선 | 방법                                        | 상태                                                                      |
| --- | -------------------------------- | ---- | ------------------------------------------- | ------------------------------------------------------------------------- |
| ①   | `03-RULES.md` S2 source 드리프트 | 높음 | 백포트 + **(c) 정본 단일화**                | ✅ 백포트(97f54dd4) → **(c) 이중 정본 제거**: templates/rules가 유일 정본 |
| ②   | 문서 스킬 4→11                   | 중   | INTENT는 정본 가리킴 · README×2는 11종 나열 | ✅ (97f54dd4)                                                             |
| ③   | rule-lint B1·B5·B6 존재검사 부재 | 중   | `ruleInvariants.test.ts` 3 it (B5 3형태)    | ✅ 54 tests · fail-first 확인 (97f54dd4)                                  |
| ④   | `projectHash` dangling comment   | 낮   | `findRepoRoot.ts` 주석 정리(의도 보존)      | ✅ (97f54dd4)                                                             |
| ⑤   | 표기 통일                        | 낮   | `user-invocable` 11 · execute hand off      | ✅ user-invocable 11/11 (97f54dd4) · ⏸ execute hand off(의미 동등, 보류)  |

## ① 근본 재발방지 — (c) 정본 단일화 (2026-07-23, 사용자 선택 "(c)+S9 예외")

**이중 정본이 드리프트의 원인**이었다 — `03-RULES.md`가 규칙 전문을 코드펜스로 갖고, `templates/rules/`가 그 추출본을 갖는 구조. 백포트(a)는 현 어긋남만 고치고 재발 구조는 남겼다. (c)는 **중복 자체를 제거**한다.

- `03-RULES.md` S1~S8 코드펜스(규칙 전문) → **정본 링크로 대체**, 판정 노트(설계 근거)는 유지. 결정적 변환 스크립트(`scratchpad/transform-03rules.mjs`)로 처리.
- **S9 `decision-trail`은 예외** — 아직 미배포(opt-in 대기)라 `templates/rules/`에 없으므로 `03-RULES.md`가 유일 정본. fence 유지.
- 정본 선언 반전: `03-RULES.md` 상단 "본 문서가 정본" → "정본은 templates/rules, 이 문서는 판정노트+링크(S9 예외)".
- 참조 갱신: `README.md` 문서지도 · `02-ARCHITECTURE.md` 레이아웃 주석.

**검증**: 8 fence→링크(변환 스크립트 `collapsed 8`) · S9 전문 PRESENT · 8개 링크 대상 전부 존재 · `test:run` 54 green · `03-RULES.md` 1006→300줄(−717). **source↔shipped 동기화 문제 원천 소멸 — (b) 검증 인프라 불요.**

## 검증 게이트 (트랙 1 + (c))

- ✅ `yarn seiri test:run` — **54 passed** (기존 51 + B1·B5·B6 3), fail-first 확인
- ✅ `yarn seiri typecheck` — exit 0
- ✅ `sync-rule-hashes --check` — up to date
- ✅ (c) 후: 8 링크 유효 · S9 전문 유지 · 규칙 파일(정본) 불변 → templateHash 불변
- ✅ `prettier` — 편집 파일 clean

## 잔여 / 후속

### 보류

- **⑤ execute "hand off"** — Rules 불릿에 녹아 의미는 제안형 성립. 별도 `Hand off:` 라인 통일은 취향, 보류.
- **② README 서술 가드** — INTENT는 정본(`SHIPPED_SKILLS`) 가리킴으로 근본 해결. README(사용자용) 스킬 목록↔`SHIPPED_SKILLS` 일치 테스트는 미작성 — 검토 대상.

### 트랙 2 — 하니스/외부 의존 (평가 리포트 §5, 이번 범위 밖)

D7 디스패치 발화율 · 10이슈 A/B · `/context` 실로드 · S9 대조군(cennad) · 통합 검증(머지 게이트) · D9 규칙 분량 슬리밍. 전부 실하니스 필요. **트랙 1 + ①(c) 완료로 선행 조건 충족.**

## 진행 로그

- **2026-07-23**: 트랙 1(①백포트②③④⑤) 완료 → 커밋 `97f54dd4`. 이어 ① 근본 재발방지 **(c) 정본 단일화** 완료 — 이중 정본 제거, S9 예외 유지. 검증 통과. **(c) 커밋 대기(사용자 지시).**
