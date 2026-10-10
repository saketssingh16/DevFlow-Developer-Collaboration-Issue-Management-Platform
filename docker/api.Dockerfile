FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY apps/api/package.json ./apps/api/
COPY prisma/schema.prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY prisma/ ./prisma/

RUN pnpm --filter @devflow/shared build
RUN pnpm --filter @devflow/validation build
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN pnpm --filter @devflow/api build

RUN addgroup -S devflow && adduser -S devflow -G devflow && mkdir -p /app/uploads && chown -R devflow:devflow /app
USER devflow
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
