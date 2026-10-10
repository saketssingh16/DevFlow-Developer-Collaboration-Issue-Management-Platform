FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY apps/worker/package.json ./apps/worker/
COPY prisma/schema.prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/
COPY prisma/ ./prisma/

RUN pnpm --filter @devflow/shared build
RUN pnpm --filter @devflow/validation build
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN pnpm --filter @devflow/worker build
RUN addgroup -S devflow && adduser -S devflow -G devflow && chown -R devflow:devflow /app
USER devflow

CMD ["node", "apps/worker/dist/index.js"]
