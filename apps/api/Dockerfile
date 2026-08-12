# Build from repo root:
#   docker build -f apps/api/Dockerfile -t hr-api .
FROM node:22-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db

RUN pnpm install --frozen-lockfile --filter @hr/api...
RUN pnpm --filter @hr/shared build \
  && pnpm --filter @hr/db build \
  && pnpm --filter @hr/api build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN useradd --create-home --uid 1001 hr

COPY --from=builder --chown=hr:hr /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=hr:hr /app/node_modules ./node_modules
COPY --from=builder --chown=hr:hr /app/apps/api ./apps/api
COPY --from=builder --chown=hr:hr /app/packages/shared ./packages/shared
COPY --from=builder --chown=hr:hr /app/packages/db ./packages/db
COPY --chown=hr:hr docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER hr
EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
