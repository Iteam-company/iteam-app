# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

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

COPY . .
RUN npm run build

# ── Stage 4: runner (prod) ────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Vinxi/TanStack Start output is self-contained — no node_modules needed
COPY --from=builder /app/.output ./.output

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
