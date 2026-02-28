---
name: diagnose
user_invocable: true
description: 인덱스 건강도 경량 진단 — kg_status 기반 빠른 상태 점검 및 권장 액션 제시
version: 1.0.0
complexity: simple
context_layers: [1, 2]
orchestrator: diagnose 스킬
plugin: coffaen
---

# diagnose — 인덱스 건강도 진단

`/coffaen:doctor`의 경량 버전. 빠른 상태 점검만 수행하며 자동 수정은 하지 않는다.
인덱스 신선도, stale 노드 비율, 재빌드 권장 여부를 즉시 보고한다.

## When to Use This Skill

- 인덱스가 최신인지 빠르게 확인하고 싶을 때
- 검색/탐색 전 상태 사전 점검
- `/coffaen:doctor` 실행 전 간단한 사전 체크
- 빌드 파이프라인에서 상태 확인

## 전제 조건

- coffaen 플러그인이 초기화되어 있어야 합니다
- 인덱스가 없어도 실행 가능 (미빌드 상태로 보고)

## 워크플로우

### Step 1 — 인덱스 상태 조회

`kg_status` MCP 도구로 기본 상태를 조회한다:

```
kg_status()
```

응답 필드:
- `nodeCount`: 총 노드 수
- `edgeCount`: 총 엣지 수
- `lastBuiltAt`: 마지막 빌드 타임스탬프
- `staleNodeCount`: Stale 노드 수
- `freshnessPercent`: 인덱스 신선도 (%)
- `rebuildRecommended`: 전체 재빌드 권장 여부

### Step 2 — 진단 보고서 생성

조회 결과를 포맷에 맞게 출력한다:

**정상 상태 (stale < 10%)**:
```
coffaen 인덱스 상태
━━━━━━━━━━━━━━━━━━━━━━━━━━
노드 수:       {N}개
엣지 수:       {N}개
마지막 빌드:   {시간 전 / YYYY-MM-DD HH:mm}
Stale 비율:   {N}% ({staleCount}개) — 정상
신선도:        {freshnessPercent}%
━━━━━━━━━━━━━━━━━━━━━━━━━━
상태: 정상
```

**주의 상태 (stale 10~30%)**:
```
coffaen 인덱스 상태
━━━━━━━━━━━━━━━━━━━━━━━━━━
노드 수:       {N}개
Stale 비율:   {N}% — 주의
━━━━━━━━━━━━━━━━━━━━━━━━━━
권장: /coffaen:rebuild 실행을 권장합니다.
```

**심각 상태 (stale > 30% 또는 인덱스 없음)**:
```
coffaen 인덱스 상태
━━━━━━━━━━━━━━━━━━━━━━━━━━
인덱스: 없음 / 심각하게 stale
━━━━━━━━━━━━━━━━━━━━━━━━━━
권장: /coffaen:build 또는 /coffaen:doctor 실행
```

### Step 3 — 권장 액션 제시

상태에 따라 다음 단계를 안내한다:

| 상태 | 권장 액션 |
|------|-----------|
| 정상 (stale < 10%) | 없음 |
| 주의 (stale 10~30%) | `/coffaen:rebuild` |
| 심각 (stale > 30%) | `/coffaen:build --force` |
| 인덱스 없음 | `/coffaen:build` |
| 구조적 문제 의심 | `/coffaen:doctor` 전체 진단 |

### Step 4 (선택) — Verbose 모드

`--verbose` 옵션 시 추가 정보를 표시한다:

- Stale 노드 경로 목록 (최대 10개)
- 마지막 빌드 이후 수정된 파일 수
- Layer별 노드 분포

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `kg_status` | 인덱스 상태 조회 (주요 도구) |

## Options

> 옵션은 LLM이 자연어로 해석한다.

```
/coffaen:diagnose [--verbose]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--verbose` | false | 상세 정보 (stale 노드 목록, Layer별 분포) |

## 사용 예시

```
/coffaen:diagnose
/coffaen:diagnose --verbose
```

## 오류 처리

- **kg_status 실패**: "MCP 서버 연결 실패. `.mcp.json` 설정을 확인하세요." 안내
- **인덱스 없음**: 미빌드 상태로 보고 후 `/coffaen:build` 안내

## Quick Reference

```
# 빠른 상태 확인
/coffaen:diagnose

# 상세 보고서
/coffaen:diagnose --verbose

# doctor와의 차이
# diagnose: 읽기 전용, 빠름 (kg_status만 호출)
# doctor: 전체 스캔 + 자동 수정 제안 (시간 소요)
```
