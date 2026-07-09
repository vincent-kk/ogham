# insightStats

## Purpose

인사이트 캡처 설정·통계·대기 알림 관리. `.maencof-meta/`에 insight-config.json, auto-insight-stats.json, pending-notification.json을 영속화하고, 민감도 자동 조정 및 메타 프롬프트 생성을 담당.

## Structure

- `index.ts` — 순수 barrel (공개 API: config/stats read·write, pending 알림, 승격 통계, 정밀도/민감도, 메타 프롬프트)
- `operations/` organ — 인사이트 연산 (config·stats read/write, pending read/append/delete, getSessionCaptureCount, updatePromotionStats, calculatePrecision, autoAdjustSensitivity, buildMetaPrompt; 공유 private helper metaPath·ensureDir 는 barrel 미노출; 함수 1개/파일)

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
- Zod 스키마(types/insight.ts)와 수동 가드(types/insightGuard.ts) 간 필드 불일치 허용 금지 — 스키마 수정 시 대응 가드도 같은 PR에서 동기화
