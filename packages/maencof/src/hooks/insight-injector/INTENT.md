# maencof-insight-injector

## Purpose

NotificationOutput 훅. 인사이트 캡처 상태 알림 주입.

## Boundaries

### Always do

- insight-stats로 현재 상태 조회
- enabled/limit 설정 확인

### Ask first

- 알림 포맷 변경

### Never do

- 인사이트 데이터 직접 수정
