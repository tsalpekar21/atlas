# Build with context at repo root:
#   docker build -f apps/bot/Dockerfile .
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

WORKDIR /app

# Copy full monorepo and build bot via Turborepo
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm turbo run build --filter=bot

# Install production dependencies only for runtime
FROM node:22-bookworm-slim AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
ENV NODE_ENV=production

WORKDIR /app
COPY . .
RUN pnpm install --prod --frozen-lockfile

# Production stage: run the Nitro server
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Copy only the built output (Nitro server is self-contained in .output)
# Keep app structure so Node resolution can find app-level pnpm symlinks
COPY --from=builder /app/apps/bot/.output ./apps/bot/.output
# Copy workspace dependencies used by Nitro externals at runtime
COPY --from=deps /app/node_modules ./node_modules
# Copy app-level node_modules symlink tree as well
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules

# Cloud Run sets PORT; Nitro server uses it
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/apps/bot
CMD ["node", ".output/server/index.mjs"]
