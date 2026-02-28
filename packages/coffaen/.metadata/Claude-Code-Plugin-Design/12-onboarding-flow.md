---
created: 2026-02-28
updated: 2026-02-28
tags: [onboarding, setup, core-identity, interview]
layer: design-area-5
---

# 12. 온보딩 플로우 (/coffaen:setup)

첫 실행 시 Core Identity를 수집하고 지식 트리를 초기화하는 인터뷰형 온보딩 스킬.

관련 문서: [./08-skill-definition.md](./08-skill-definition.md) | [./02-knowledge-tree-structure.md](./02-knowledge-tree-structure.md) | [./13-autonomy-levels.md](./13-autonomy-levels.md)

---

## /coffaen:setup 플로우

```
1단계: 환영 메시지 + 기억공간 경로 설정
        ↓
2단계: Core Identity 인터뷰 (최소 5개 질문)
        ↓
3단계: 초기 지식 트리 스캐폴딩
        ↓
4단계: Progressive Autonomy Level 0 설정
        ↓
5단계: 첫 번째 기억 기록 가이드
```

AskUserQuestion 도구로 단계별 진행. 각 질문은 건너뛰기 허용 (나중에 `/coffaen:remember`로 추가 가능).

---

## Core Identity 인터뷰 질문

### 최소 세트 (5개, 필수)
1. 이름/호칭 — "어떻게 불러드릴까요?"
2. 핵심 가치관 3가지 — "가장 중요하게 여기는 가치는 무엇인가요?"
3. 절대 경계 1가지 — "AI가 절대 하지 않았으면 하는 것은?"
4. 주요 관심사 — "요즘 가장 몰두하는 주제나 분야는?"
5. 커뮤니케이션 스타일 — "간결하게 vs 자세하게, 어떤 방식을 선호하세요?"

### 확장 세트 (10개, 선택)
6. 직업/역할
7. 장기 목표
8. 학습 스타일 (탐색형 vs 체계형)
9. 의사결정 기준 (직관 vs 분석)
10. 일상 루틴 (기억 트리거 시점 파악용)

---

## 초기 Layer 1 파일 목록

온보딩 완료 시 자동 생성:

| 파일 | 내용 |
|------|------|
| `01_Core/identity.md` | 이름, 호칭, 기본 정체성 |
| `01_Core/values.md` | 핵심 가치관 |
| `01_Core/boundaries.md` | 절대 경계 |
| `01_Core/preferences.md` | 커뮤니케이션 선호 |
| `01_Core/trust-level.json` | 신뢰 레벨 메타데이터 (Level 0으로 초기화) |

`trust-level.json` 스키마 상세: [./13-autonomy-levels.md](./13-autonomy-levels.md)

---

## UX 원칙

- **인터뷰형**: 한 번에 하나의 질문만 제시
- **건너뛰기 허용**: 모든 질문에 "나중에" 옵션 제공
- **즉시 확인**: 입력 내용을 바로 요약하여 확인 요청
- **점진적 확장**: 최소 세트 완료 후 확장 세트 여부를 사용자가 선택
