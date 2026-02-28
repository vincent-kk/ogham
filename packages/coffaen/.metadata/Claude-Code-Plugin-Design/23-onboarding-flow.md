---
created: 2026-02-28
updated: 2026-02-28
tags: [onboarding, setup, core-identity, interview, index-build]
layer: design-area-5
---

# 온보딩 플로우 — /coffaen:setup + 초기 인덱스 빌드

## 개요

첫 실행 시 Core Identity를 수집하고, 지식 트리를 초기화한 뒤,
검색 엔진 인덱스를 구축하는 인터뷰형 온보딩 스킬.

관련 문서: [스킬 명세](./18-skills.md) | [5-Layer 지식 모델](./02-knowledge-layers.md) | [Progressive Autonomy](./22-autonomy-levels.md)

---

## 1. /coffaen:setup 플로우

```
1단계: 환영 메시지 + 기억공간 경로 설정
2단계: Core Identity 인터뷰 (최소 5개 질문)
3단계: 초기 지식 트리 스캐폴딩
4단계: Progressive Autonomy Level 0 설정
5단계: 초기 인덱스 빌드 (.coffaen/ 생성)
6단계: 첫 번째 기억 기록 가이드
```

AskUserQuestion으로 단계별 진행. 모든 질문 건너뛰기 허용.

---

## 2. Core Identity 인터뷰

### 최소 세트 (5개)
1. 이름/호칭
2. 핵심 가치관 3가지
3. 절대 경계 1가지
4. 주요 관심사
5. 커뮤니케이션 스타일

### 확장 세트 (5개, 선택)
6. 직업/역할 | 7. 장기 목표 | 8. 학습 스타일 | 9. 의사결정 기준 | 10. 일상 루틴

---

## 3. 초기 파일 생성

| 파일 | 내용 |
|------|------|
| `01_Core/identity.md` | 이름, 호칭, 정체성 |
| `01_Core/values.md` | 핵심 가치관 |
| `01_Core/boundaries.md` | 절대 경계 |
| `01_Core/preferences.md` | 커뮤니케이션 선호 |
| `01_Core/trust-level.json` | Level 0 초기화 |

---

## 4. 초기 인덱스 빌드 (신규 단계)

온보딩 완료 후 자동 실행:
```
1. VaultScanner: 초기 파일 스캔 (Core Identity 문서들)
2. DocumentParser: Frontmatter + 링크 파싱
3. GraphBuilder: 초기 그래프 구축
4. MetadataStore: .coffaen/ 디렉토리에 저장
```

기존 마크다운 저장소가 있는 경우: 전체 빌드를 제안하고 사용자 확인 후 실행.

---

## 5. UX 원칙

- 인터뷰형: 한 번에 하나의 질문만
- 건너뛰기 허용: 모든 질문에 "나중에" 옵션
- 즉시 확인: 입력 요약 후 확인 요청
- 점진적 확장: 최소 세트 완료 후 확장 세트 선택
