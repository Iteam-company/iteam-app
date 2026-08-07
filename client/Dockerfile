# ── Stage 1: deps ─────────────────────────────────────────────────────────────
# node:22 required — @tanstack/react-start and friends declare engines >=22.12.0
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ── Stage 2: dev (source mounted at runtime via compose volume) ───────────────
FROM deps AS dev

# Bake in root-level config files — Vite/Vinxi needs these to load plugins
# (tanstackStart, tailwind, etc). Only src/ and public/ are bind-mounted.
COPY vite.config.ts tsconfig.json components.json ./

EXPOSE 3000
ENV NODE_ENV=development

# --host binds Vite to 0.0.0.0 so it's reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host"]

# ── Stage 3: builder ──────────────────────────────────────────────────────────
FROM deps AS builder

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ── Stage 4: runner (prod) ──────────────────────────────────────────────────
FROM builder AS runner

WORKDIR /app

EXPOSE 3000
ENV NODE_ENV=production

CMD ["sh", "-c", "npm run preview -- --port ${PORT:-3000} --host"]
