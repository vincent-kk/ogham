.PHONY: install dev-backend dev-frontend build serve clean

install:
	npm install --workspaces

dev-backend:
	npm run dev --workspace=backend

# Align the Vite /api proxy with the backend's actual port. read-api-port.mjs
# reads .dashboard-runtime.json (written by the backend after it binds); start
# dev-backend first so the file exists. Falls back to 5174 when absent.
dev-frontend:
	DASHBOARD_API_PORT=$$(node scripts/read-api-port.mjs) npm run dev --workspace=frontend

build:
	npm run build --workspace=frontend
	npm run build --workspace=backend

# DASHBOARD_OPEN=1 makes the backend open the browser on the port it bound
# (auto-stepping past any in-use port).
serve: build
	DASHBOARD_OPEN=1 npm run start --workspace=backend

clean:
	rm -rf backend/node_modules frontend/node_modules backend/dist backend/app/static node_modules
