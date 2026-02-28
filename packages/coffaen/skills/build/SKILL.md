---
name: build
user_invocable: true
description: 지식 그래프 인덱스 전체/증분 구축
version: 1.0.0
complexity: medium
context_layers: [1, 2]
orchestrator: build 스킬
---

# build — 인덱스 구축

vault의 마크다운 문서를 스캔하여 지식 그래프 인덱스를 구축한다.
변경 파일만 재처리하는 증분 빌드를 기본으로 사용한다.

## When to Use This Skill

- 처음 vault를 설정한 후 초기 인덱스 구축
- 대량의 문서를 추가/수정한 후
- `/coffaen:diagnose`에서 재빌드를 권장받았을 때
- 전체 재구축이 필요할 때 (`--full` 옵션)

## 워크플로우

### Step 1 — 상태 확인

`kg_status` MCP 도구로 현재 인덱스 상태를 확인한다.
- 인덱스 없음 → 전체 빌드 실행
- Stale 10% 미만 → 증분 빌드 실행
- Stale 10% 이상 → 전체 빌드 권장 후 사용자 확인

### Step 2 — 빌드 실행

빌드 파이프라인:
```
1. VaultScanner: 파일 목록 + mtime 수집
2. DocumentParser: Frontmatter + 링크 파싱 (변경 파일만)
3. GraphBuilder: 그래프 구성/갱신
4. DAGConverter: 순환 탐지 + 처리
5. WeightCalculator: 가중치 계산
6. MetadataStore: .coffaen/ JSON 저장
```

증분 빌드 시: 변경 파일 + 1-hop 이웃만 재계산.

### Step 3 — 완료 보고

```
✅ 인덱스 빌드 완료
노드: 123개 | 엣지: 456개
소요 시간: 2.3초
빌드 유형: 증분 (12개 파일 갱신)
```

## Available MCP Tools

| 도구 | 용도 |
|------|------|
| `kg_status` | 현재 인덱스 상태 |

## Options

```
/coffaen:build [--full] [--dry-run]
```

| 옵션 | 설명 |
|------|------|
| `--full` | 전체 재빌드 강제 실행 |
| `--dry-run` | 변경 사항만 확인 (실제 빌드 없음) |
