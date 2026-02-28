---
name: rebuild
user_invocable: true
description: 인덱스 강제 전체 재구축 — 기존 캐시를 무시하고 처음부터 전체 인덱스를 다시 빌드
version: 1.0.0
complexity: simple
plugin: coffaen
---

# rebuild — 인덱스 강제 전체 재구축

기존 `.coffaen/` 인덱스 캐시를 무시하고 전체 지식 그래프를 처음부터 재구축합니다.
`/coffaen:build`의 force 모드입니다.

## 언제 사용하는가

- 인덱스가 손상되었거나 일관성이 없을 때
- 대규모 파일 이동/삭제/추가 후 증분 빌드가 불완전할 때
- `/coffaen:doctor`가 재구축을 권장할 때
- 인덱스 구조 변경 후 마이그레이션이 필요할 때

## 워크플로우

### Step 1 — 사전 확인

현재 인덱스 상태를 조회하여 재구축 전 스냅샷을 저장합니다.

```
kg_status()
```

이전 상태 기록:
- 노드 수: {before_nodes}
- 엣지 수: {before_edges}
- 마지막 빌드: {last_built}
- stale 노드 수: {stale_count}

### Step 2 — 사용자 확인

재구축은 시간이 걸릴 수 있으므로 확인을 요청합니다.

```
전체 재구축을 시작합니다.
- 기존 인덱스: {before_nodes}개 노드, {before_edges}개 엣지
- 예상 시간: 문서 수에 따라 수 초 ~ 수 분

계속하시겠습니까? [예/아니오]
```

`--force` 옵션이 있으면 확인 없이 즉시 진행합니다.

### Step 3 — 전체 재구축 실행

`kg_build`를 `force=true`로 호출합니다.

```
kg_build(force=true)
```

진행 상황을 실시간으로 표시합니다:
```
재구축 진행 중...
  [1/4] 파일 스캔 중...
  [2/4] 문서 파싱 중...
  [3/4] 그래프 구성 중...
  [4/4] 인덱스 저장 중...
완료!
```

### Step 4 — 결과 보고

재구축 전후를 비교하여 결과를 보고합니다.

```
## 재구축 완료

| 항목 | 이전 | 이후 | 변화 |
|------|------|------|------|
| 노드 수 | {before_nodes} | {after_nodes} | {delta_nodes:+d} |
| 엣지 수 | {before_edges} | {after_edges} | {delta_edges:+d} |
| Layer 1 | {before_l1} | {after_l1} | {delta_l1:+d} |
| Layer 2 | {before_l2} | {after_l2} | {delta_l2:+d} |
| Layer 3 | {before_l3} | {after_l3} | {delta_l3:+d} |
| Layer 4 | {before_l4} | {after_l4} | {delta_l4:+d} |

빌드 시간: {duration}초
```

변화가 큰 경우 (노드 ±20% 이상) 경고를 표시하고 원인 확인을 권장합니다.

## MCP 도구

| 도구 | 목적 |
|------|------|
| `kg_status` | 재구축 전후 상태 조회 |
| `kg_build` | 전체 재구축 실행 (force=true) |

## 옵션

```
/coffaen:rebuild [옵션]
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--force` | — | 확인 없이 즉시 재구축 |
| `--no-backup` | — | 기존 인덱스 백업 건너뜀 (빠름) |

## 사용 예시

```
/coffaen:rebuild
/coffaen:rebuild --force
```

## `/coffaen:build`와 차이점

| | `/coffaen:build` | `/coffaen:rebuild` |
|---|---|---|
| 모드 | 증분 빌드 (기본) / 전체 (`--full`) | 항상 전체 재구축 |
| 캐시 | 변경된 파일만 처리 | 모든 캐시 무시 |
| 속도 | 빠름 | 느림 (전체 처리) |
| 용도 | 일상적 업데이트 | 복구/마이그레이션 |

## 오류 처리

- **빌드 실패**: 오류 메시지 표시, 이전 인덱스 자동 복원 (백업이 있는 경우)
- **디스크 공간 부족**: 경고 후 중단, 임시 파일 정리 안내
- **권한 오류**: 경로 권한 확인 안내
