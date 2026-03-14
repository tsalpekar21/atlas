# Build with context at repo root:
#   docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm turbo run build --filter=@atlas/api

# Production stage
FROM node:22-bookworm-slim AS runner

WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.mjs"]
