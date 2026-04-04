---
created: 2026-03-18
updated: 2026-03-18
tags: [NPDP, design-philosophy, FCA, filid, ogham, PL-agenda]
layer: 4
title: NPDP A5 — Vincent's Development Soul 정의
expires: 2026-04-15
---
# NPDP A5 — Vincent's Development Soul 정의

## Vincent's Development Soul

### 근본 원리: 낭비 없는 정밀함
인지적 낭비(S1), 타입 정보의 낭비(S2), 연산의 낭비(S3) 모두 거부.

### 3대 원칙

**S1 프랙탈 봉인 (Fractal Encapsulation)**
- 모든 단위는 프랙탈, 내부 자유 import, 외부는 index.ts export만
- index.ts는 import / export / rename 외 불허
- **제로 피어 파일 규칙**: 프랙탈 루트에 index.ts (+INTENT.md/DETAIL.md) 외 단일 파일 금지. 모든 구성요소는 하위 디렉토리(서브 프랙탈)여야 한다.
- 최소 공통 부모(LCA) 규칙: 공유 함수는 사용처 간 LCA에 위치 → 영향 범위를 서브트리로 한정
- 파일 길이 ~100줄 (인지적 선호, class 등 예외 허용)

**S2 강타입 구체화 (Type Concretization)**
- 이상: 하나의 input → 완벽한 하부 타입 구체화
- 현실 타협: TS greedy 추론 한계로 완벽한 강타입은 추론 속도 저하 유발
- any 사용 3조건: ① 명확한 이유 ② 주석 보완 ③ ⛔ return을 통한 any 방출(오염) 절대 금지
- any는 "봉인(contain)" — 타입의 프랙탈 봉인

**S3 단위성능 우선 (Per-unit Performance)**
- 구조적 우아함보다 실행 효율
- array.filter().map().forEach() 체이닝, 불필요한 중간 배열 생성 거부
- @winglet/common-utils 등 고속 라이브러리 우선 사용
- FE 개발자이지만 머신 레벨 최적화 추구

### 인지범위의 이중 구조

**LLM을 위한 인지범위 → 프랙탈 구조 (FCA)**
- 컨텍스트 윈도우에 맞는 bounded context
- INTENT.md + DETAIL.md로 프랙탈 내부 가이드

**인간을 위한 인지범위**
- ① index.ts 경계 봉인
- ② LCA 규칙 (테스트 범위 결정)
- ③ 파일 ~100줄
- 인간은 프랙탈의 경계와 상호작용만 감독. 내부 전체를 읽을 필요 없음.

### 강제 전략

**비용 함수**: cost = f(수정으로 인한 오류 발생 확률), NOT f(코드량)
- LLM이 코드의 단위 가치를 떨어뜨렸으므로 코드를 다시 쓰는 건 싸다
- 수정 과정에서 오류가 유입될 확률이 진짜 비용

**사전 (ogham)**: 오류 전파 범위가 넓은 것
- S1 프랙탈 경계 (구조 변경 → import 체인/의존성 전체 파급)
- S2 any 방출 금지 (타입 체인 역추적 → 연쇄 타입 에러)

**사후 (filid)**: 오류 확률이 낮은 것
- S3 winglet 대체 (로컬 함수 → 유틸 호출, 입출력 동일)
- 네이밍, 포맷 (기계적 치환)

**게이트**: PR 경계
- filid 3단계: ① FCA 구성 → ② FCA 검증 → ③ FCA 수정
- 개별 커밋은 검증 대상 아님

### 관련
- [[03_External/structural/fca-ai-architecture]]
- [[03_External/structural/filid-plugin]]
- [[04_Action/npdp-session-context-20260316]]