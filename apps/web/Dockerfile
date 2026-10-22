# Build from repo root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
#     --build-arg NEXT_PUBLIC_WS_URL=wss://api.example.com/ws \
#     --build-arg NEXT_PUBLIC_UI_REDESIGN=1 \
#     -t hr-web .
FROM node:22-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
ARG NEXT_PUBLIC_UI_REDESIGN=
ARG NEXT_PUBLIC_UI_REDESIGN_TENANTS=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_UI_REDESIGN=$NEXT_PUBLIC_UI_REDESIGN
ENV NEXT_PUBLIC_UI_REDESIGN_TENANTS=$NEXT_PUBLIC_UI_REDESIGN_TENANTS
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
COPY packages/i18n ./packages/i18n

RUN pnpm install --frozen-lockfile --filter @hr/web...
RUN pnpm --filter @hr/shared build \
  && pnpm --filter @hr/i18n build \
  && pnpm --filter @hr/web build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN useradd --create-home --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nextjs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nextjs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
