FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true
RUN apk add --no-cache openssl
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile --filter @kitchenflow/api... --prod=false

FROM deps AS build
COPY apps/api apps/api
COPY packages/types packages/types
COPY packages/config packages/config
RUN pnpm --filter @kitchenflow/api prisma:generate
RUN pnpm --filter @kitchenflow/api build
RUN pnpm install --frozen-lockfile --filter @kitchenflow/api... --prod

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4000
CMD ["pnpm", "--filter", "@kitchenflow/api", "start"]
