# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ── Stage 2: dev (source mounted at runtime via compose volume) ───────────────
FROM deps AS dev

# Bake in root-level config files — nest start --watch needs these.
# Only src/ is bind-mounted at runtime; these don't change often.
COPY tsconfig*.json nest-cli.json ./

# Generate the Prisma client into the image.
# generate only reads the schema — no DATABASE_URL needed at build time.
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
RUN npx prisma generate

EXPOSE 3000
ENV NODE_ENV=development
# Required for chokidar to detect file changes inside a Docker bind mount
ENV CHOKIDAR_USEPOLLING=true

CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && exec npm run start:dev"]

# ── Stage 3: builder ──────────────────────────────────────────────────────────
FROM deps AS builder

COPY . .
# generate must run before nest build so the client types exist
RUN npx prisma generate && npm run build

# ── Stage 4: runner (prod) ────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install production deps only — excludes NestJS CLI, ts-node, jest, etc.
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

EXPOSE 3000
ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main"]
