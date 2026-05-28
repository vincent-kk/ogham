.PHONY: install dev-backend dev-frontend build serve clean

install:
	npm install --workspaces

dev-backend:
	npm run dev --workspace=backend

dev-frontend:
	npm run dev --workspace=frontend

build:
	npm run build --workspace=frontend
	npm run build --workspace=backend

serve: build
	npm run start --workspace=backend

clean:
	rm -rf backend/node_modules frontend/node_modules backend/dist backend/app/static node_modules
