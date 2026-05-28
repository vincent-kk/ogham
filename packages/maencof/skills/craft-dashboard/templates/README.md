# Vault Dashboard

`craft-dashboard` 로 생성된 개인 vault 대시보드입니다. Fastify(백엔드) + Vite/React 19(프런트엔드) 워크스페이스로 구성됩니다.

## 디렉토리 구조

```
.
├── dashboard-spec.json    # 인터뷰 결과 (MUTATE 모드의 입력)
├── backend/               # Fastify + chokidar + Fuse.js
└── frontend/              # Vite + React 19 + TanStack Query + Recharts
```

## 설치

```bash
make install
```

## 실행

### 개발 모드 (HMR + autoreload)

```bash
# 터미널 1
make dev-backend
# 터미널 2
make dev-frontend
```

브라우저: `http://localhost:5173` (Vite). `/api/*` 는 백엔드 5174로 proxy.

### 프로덕션 모드

```bash
make serve
```

브라우저: `http://127.0.0.1:5174`. 프런트엔드 정적 자산은 `backend/app/static/` 에 빌드됩니다.

## 환경 변수

| 변수          | 기본          | 설명                                                                   |
| ------------- | ------------- | ---------------------------------------------------------------------- |
| `VAULT_ROOT`  | 부모 디렉토리 | vault 절대 경로                                                        |
| `VAULT_INDEX` | `maencof`     | `maencof` (`.maencof/*.json` read-only) 또는 `independent` (fast-glob) |
| `PORT`        | `5174`        | 백엔드 포트                                                            |

## 수정 (MUTATE 모드)

대시보드 사양을 수정하려면:

```
/maencof:craft-dashboard mutate
```

`dashboard-spec.json` 을 다시 인터뷰하고, 변경된 패널/검색만 점진 적용합니다. `// USER-EDIT-START` / `END` 영역은 보존됩니다.

## 디자인 토큰

`frontend/src/styles/tokens.css` 는 빈 슬롯입니다. 본인의 UI 시스템/스킬로 채우십시오. craft-dashboard 는 디자인 토큰을 정의하지 않습니다.

## 라이선스

(프로젝트 정책에 따름)
