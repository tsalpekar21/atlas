# Build with context at repo root:
#   docker build -f apps/ai/Dockerfile .
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

WORKDIR /app

# Copy full monorepo and build via Turborepo (builds @atlas/schemas first, then mastra build)
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm turbo run build --filter=ai

# Production stage: mastra build output is self-contained with its own node_modules
FROM node:22-bookworm-slim AS runner

WORKDIR /app

COPY --from=builder /app/apps/ai/.mastra/output ./

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "index.mjs"]
