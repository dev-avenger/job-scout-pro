FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Development
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
CMD ["pnpm", "--filter", "@auto-job-apply/api", "dev"]

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm build

# Production
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
