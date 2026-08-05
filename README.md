# Iteam

Full-stack application — TanStack Start (SSR) · NestJS · PostgreSQL.

## Structure

```

└── iteam-app/
    ├── docker-compose.yml        # production
    ├── docker-compose.dev.yml    # development (hot reload / HMR)
    ├── .env.example
    ├── client/               # TanStack Start (React SSR, Vite/Vinxi)
    │   ├── Dockerfile
    │   └── src/
    └── server/               # NestJS REST API
        ├── Dockerfile
        └── src/
```

## Quick start

```bash
cp .env.example .env
# Set DB_PASSWORD in .env
```

### Production

Builds optimised images, runs compiled output.

```bash
docker compose up --build

# Stop
docker compose down

# Stop and wipe the database volume
docker compose down -v
```

### Development (hot reload)

Mounts host source into the containers — no rebuild needed on save.
- **Client**: Vite HMR
- **Server**: NestJS `--watch` via chokidar

```bash
docker compose -f docker-compose.dev.yml up --build

# Stop
docker compose -f docker-compose.dev.yml down
```

## Ports

| Service | Host port | Notes                               |
|---------|-----------|-------------------------------------|
| Client  | 3000      | TanStack Start SSR / Vite HMR       |
| Server  | 4000      | NestJS API (`/health`)              |
| DB      | 5432 (dev only) | Internal only in prod          |

## Health checks

Compose waits for each service before starting dependents:

- **db** — `pg_isready`
- **server** — `GET /health`
- **client** — `GET /`

Add a `/health` endpoint to NestJS if it does not exist yet (see [server/src/app.controller.ts](iteam-app/server/src/app.controller.ts)).

## Local development (no Docker)

```bash
# Terminal 1 — database only via Docker
docker compose -f docker-compose.dev.yml up db

# Terminal 2 — server
cd iteam-app/server && npm install && npm run start:dev

# Terminal 3 — client
cd iteam-app/client && npm install && npm run dev
```
