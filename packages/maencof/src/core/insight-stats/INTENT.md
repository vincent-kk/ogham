# insight-stats

## Purpose

인사이트 캡처 설정·통계·대기 알림 관리. `.maencof-meta/`에 insight-config.json, auto-insight-stats.json, pending-notification.json을 영속화하고, 민감도 자동 조정 및 메타 프롬프트 생성을 담당.

## Structure

- `insight-stats.ts` — readInsightConfig, writeInsightConfig, readInsightStats, incrementInsightStats, readPendingNotification, appendPendingCapture, deletePendingNotification, getSessionCaptureCount, updatePromotionStats, calculatePrecision, autoAdjustSensitivity, buildMetaPrompt
- `index.ts` — barrel export

## Boundaries

### Always do

- InsightConfigSchema(Zod)로 설정 파싱 및 기본값 fallback
- calculatePrecision은 순수 함수로 유지
- autoAdjustSensitivity는 제안만 반환 (adjusted: false), 파일 직접 수정 금지

### Ask first

- 민감도 자동 조정 임계값(0.3/0.8) 변경
- 세션당 최대 캡처 한도 정책 변경

### Never do

- autoAdjustSensitivity에서 설정 파일 직접 수정
- mcp/ 또는 hooks/ 직접 의존
