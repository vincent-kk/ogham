# probeAdvisory

## Purpose

selfProbe 진단 결과를 세션 시작 경고로 번역. 정상 동작에서도 발생하는 신호(`CLAUDE_PLUGIN_ROOT not set` — env 미전파가 기본)를 걸러 실제 행동 가능한 실패(node/git/PATH)만 로그·경고 대상으로 남긴다.

## Boundaries

### Always do

- 필터 결과가 비면 advisory `null` (로그도 경고도 없음)
- 경고 문구에 error-log 경로 안내 유지

### Ask first

- 무시 목록(IGNORED_PROBE_ERRORS) 항목 추가/제거

### Never do

- shared selfProbe 자체 수정에 의존하는 계약 (maencof 측 필터로 한정)
- 경고를 systemMessage 등 다른 채널로 이중 발신
