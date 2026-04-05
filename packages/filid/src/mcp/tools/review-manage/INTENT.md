# review-manage -- 코드 리뷰 세션 관리 도구

## Purpose

`filid:review` 워크플로우의 세션 상태 관리. 브랜치 정규화, 체크포인트
판정, 위원회 선출, 콘텐츠 해시/캐시, 세션 정리, PR 코멘트 포맷팅 담당.

## Structure

- `review-manage.ts` — 주 핸들러 (모든 action dispatch)
- `format/` organ — PR/revalidate 코멘트 포맷팅 헬퍼 (내부 구현)
- `utils/` organ — 브랜치 정규화 · 경로 해석 등 공유 유틸리티 (내부 구현)

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트
- `format/` · `utils/` 수정은 review-manage 계약과 동기화

### Ask first

- 공개 API 시그니처 변경
- `format/` · `utils/` organ을 다른 도구가 의존하려 할 때 (승격 필요)

### Never do

- `format/` · `utils/`에 INTENT.md 추가 (organ-no-intentmd)
- 다른 MCP 도구에서 `format/` · `utils/` 직접 import (review-manage 경유)

## Dependencies

- `../../../types/review.js`, `../../../types/summary.js`
- `../../../core/utils/` (format 내부 사용)
- `node:fs/promises`, `node:path`, `node:child_process`
