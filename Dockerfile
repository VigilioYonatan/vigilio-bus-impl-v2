# syntax=docker/dockerfile:1.15
# ─────────────────────────────────────────────────────────────────────────────
# @vigilio-services/bus-impl-v2 — Production Container
#
# Multi-stage build:
#   1. deps       — install ALL deps (dev + prod) for TypeScript compilation
#   2. builder    — compile TypeScript to ESM dist
#   3. prod-deps  — re-install PROD-only deps (smaller node_modules)
#   4. runner     — distroless runtime (no shell, no package manager, uid=65532)
#
# The npmrc build secret is injected by docker/build-push-action:
#   secrets: "npmrc=//npm.pkg.github.com/:_authToken=<GH_PACKAGES_TOKEN>"
#
# The Helm chart addresses the node binary at /nodejs/bin/node (distroless
# default path). CMD here is the JS entry-point; distroless sets the ENTRYPOINT.
# ─────────────────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Full dependency install (dev + prod)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./

# packageManager is the single source of truth for the pnpm version.
RUN corepack enable && corepack prepare $(node -p "require('./package.json').packageManager") --activate

# The private @vigilioyonatan/* packages live in GitHub Packages.
# The build secret avoids persisting credentials in any layer.
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile --prefer-offline

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — TypeScript → ESM compilation
# ──────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Reuse node_modules from the deps stage (avoid re-downloading)
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json tsconfig.build.json ./
RUN corepack enable && corepack prepare $(node -p "require('./package.json').packageManager") --activate
COPY src ./src

# tsc -p tsconfig.build.json && vigilio-node fix-esm-imports
RUN pnpm build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — Production-only dependencies (leaner runtime layer)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS prod-deps

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable && corepack prepare $(node -p "require('./package.json').packageManager") --activate

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    pnpm install --frozen-lockfile --prefer-offline --prod

# ──────────────────────────────────────────────────────────────────────────────
# Stage 4 — Distroless runtime
#   gcr.io/distroless/nodejs24-debian12:nonroot
#   • No shell, no apk, no curl — minimal attack surface
#   • Runs as uid=65532 (nonroot) — no privilege escalation possible
#   • Node 24 LTS — matches engines requirement in package.json
# ──────────────────────────────────────────────────────────────────────────────
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Production node_modules (no devDependencies)
COPY --from=prod-deps /app/node_modules ./node_modules

# Compiled JavaScript (ESM, fixed imports)
COPY --from=builder /app/dist ./dist

# Drizzle migration SQL files — needed by db:migrate:prod at runtime
COPY --chown=65532:65532 drizzle ./drizzle

EXPOSE 3000

# distroless ENTRYPOINT = /nodejs/bin/node
# Helm values.yaml: command=["/nodejs/bin/node"], args=["dist/src/main.js"]
CMD ["dist/src/main.js"]
