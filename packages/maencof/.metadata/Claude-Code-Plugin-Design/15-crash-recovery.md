---
created: 2026-02-28
updated: 2026-02-28
tags: [crash-recovery, wal, transaction, spof, atomicity]
layer: design-area-3
---

# 크래시 복구 — WAL, 트랜잭션 원자성, SPOF 대응

## 목적

인덱스 빌드, 기억 전이 등 다단계 파일 조작이 중단되었을 때
데이터 무결성을 보장하는 복구 메커니즘을 정의한다.

관련 문서: [플러그인 아키텍처](./16-plugin-architecture.md) | [메타데이터 전략](./12-metadata-strategy.md) | [설계 원칙](./01-design-principles.md)

---

## 1. 영속성 약점 분석

| 약점 | 영향 범위 | 심각도 |
|------|----------|--------|
| 트랜잭션 원자성 부재 | 인덱스 빌드, 기억 전이 | 높음 |
| crash recovery 없음 | 모든 다단계 파일 조작 | 높음 |
| backlink-index.json SPOF | 링크 탐색 전체 | 중간 |
| .maencof/ 일관성 | 검색 품질 | 중간 |

---

## 2. WAL (Write-Ahead Log) 기반 복구

### 원칙
파일 변경 전에 의도를 로그에 기록하고, 변경 후에 로그를 제거한다.

### 구현

```
1. WAL 파일 생성: .maencof-meta/wal.json
2. 변경 의도 기록 (원본 경로, 대상 경로, 작업 유형)
3. 실제 파일 조작 실행
4. WAL 파일 삭제 (성공 시)
```

### SessionStart 복구
```
1. .maencof-meta/wal.json 존재 확인
2. 존재 시 → 미완료 트랜잭션 감지
3. WAL 내용 기반으로 롤백 또는 재실행 결정
4. 복구 완료 후 WAL 삭제
```

---

## 3. 트랜잭션 원자성 보장

### 기억 전이 (Layer 간 이동)
```
WAL 기록 → 대상 디렉토리에 복사 → Frontmatter 갱신
  → backlink 재구축 → 원본 삭제 → WAL 삭제
```
중단 시: 복사본 존재하면 원본 삭제 생략 (둘 다 존재 허용, 다음 세션에서 정리).

### 인덱스 빌드
`.maencof/` 빌드 중 크래시 → "인덱스는 파생물" 원칙으로 재빌드. WAL 불필요.

---

## 4. SPOF 대응

### backlink-index.json 보호
- **완화**: 원본 마크다운에서 언제든 재구축 가능 (파생물)
- **최적화**: SessionStart 시 무결성 체크 (엔트리 수 vs 파일 수 비교)
- 불일치 감지 시 자동 재구축 트리거

### .maencof/ 캐시 보호
- `.maencof/` 전체가 파생물. 삭제 후 `/maencof:build`로 완전 복구
- `.maencof/.lock` 파일로 동시 빌드 방지

---

## 5. Layer 4 크래시 보호

**문제**: 세션 중 생성된 Action Layer 문서가 커밋 전 손실될 수 있음.

**대응**:
- Layer 4 문서는 생성 즉시 파일에 기록 (메모리 캐시 없음)
- `expires` 미설정 문서는 기본 30일 만료로 안전망 제공
- SessionEnd Hook에서 미저장 컨텍스트 경고 (가능한 범위 내)
