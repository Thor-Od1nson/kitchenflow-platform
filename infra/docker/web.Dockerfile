FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile --filter @kitchenflow/web... --prod=false

FROM deps AS build
COPY apps/web apps/web
RUN pnpm --filter @kitchenflow/types build
RUN pnpm --filter @kitchenflow/web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@kitchenflow/web", "start"]
