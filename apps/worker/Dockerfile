FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/db/package.json ./packages/db/
COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --frozen-lockfile

FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY . .
CMD ["pnpm", "--filter", "@auto-job-apply/worker", "dev"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY . .
RUN pnpm build

FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=deps /app/node_modules ./node_modules
CMD ["node", "apps/worker/dist/worker.js"]
