# Phase 6: 고속화 (선택)

> 상태: 미결 사항 결정 필요 (#1)

## 목표

Hook 실행 오버헤드를 최소화하여 사용자 경험에 영향을 주지 않는 수준으로 낮춘다.

## 선행 조건

- Phase 4 완료 (디스크 캐시)

## 현재 성능 프로파일

| 구현 방식 | Cold Start | 구현 복잡도 | 비고 |
|---|---|---|---|
| Node.js cold start | ~100ms | 낮음 | 프로토타입 단계 (현재) |
| Shell + jq | ~10ms | 중간 | 디스크 캐시 히트 시 충분 |
| **Daemon + IPC** | ~1ms | 높음 | 인메모리 캐시 필수 시 |
| Rust/Go 바이너리 | ~5ms | 높음 | 배포 복잡도 증가 |

## ⚠️ 미결 사항 #1: Daemon 채택 여부

### Daemon 채택 시

- 인메모리 경로 맵 (1차 캐시) 가능
- FSEvents/inotify 실시간 감지 통합
- Hook → IPC로 Daemon에 질의 (~1ms)
- 복잡도: 높음 (프로세스 관리, IPC 프로토콜, 자동 기동/종료)

### Daemon 미채택 시

- 디스크 캐시만 사용 (Phase 4)
- Shell + jq로 캐시 읽기 (~10ms)
- 복잡도: 낮음
- FSEvents 사용 불가 → mtime 폴링만

### 판단 기준

- Phase 4까지 구현 후 실제 성능 측정
- ~10ms (Shell+jq)가 수용 가능하면 Daemon 불필요
- ~100ms (Node.js cold start)가 체감되면 최적화 필요

## 산출물 (Daemon 채택 시)

- Daemon 프로세스 관리 (자동 기동/종료)
- IPC 프로토콜 (Unix socket 또는 TCP)
- 인메모리 캐시 + FSEvents 연동
- Hook → Daemon 질의 클라이언트

## 산출물 (Daemon 미채택 시)

- Shell + jq 기반 캐시 리더
- Node.js cold start 최적화 (lazy import, 번들 경량화)
