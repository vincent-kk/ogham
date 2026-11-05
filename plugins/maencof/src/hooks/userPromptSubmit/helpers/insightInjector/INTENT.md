# insightInjector

## Purpose

UserPromptSubmit 훅. 인사이트 캡처 상태 알림 주입.

## Conventions

허용 카테고리 배너와 capture-time 차단은 별도 책임이다. pending 통지를 읽으면 다음 SessionStart 소비자와 경쟁하므로 상태 표시만 소유한다.

## Boundaries

### Always do

- insightStats로 현재 상태 조회
- enabled/limit 설정 확인

### Ask first

- 알림 포맷 변경

### Never do

- 인사이트 데이터 직접 수정
