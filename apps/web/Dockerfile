# Build with context at repo root:
#   docker build -f apps/web/Dockerfile .
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

WORKDIR /app

# Copy full monorepo and build web via Turborepo
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm turbo run build --filter=web

# Production stage: Nitro output is self-contained
FROM node:22-bookworm-slim AS runner

WORKDIR /app

COPY --from=builder /app/apps/web/.output ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.mjs"]
