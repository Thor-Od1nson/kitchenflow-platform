# KitchenFlow Commerce

Enterprise restaurant commerce infrastructure inspired by UrbanPiper, Toast, Stripe, Shopify Admin, and Linear.

## Apps

- `apps/web`: Next.js 15 App Router dashboard and marketing site.
- `apps/api`: NestJS API with Prisma, RBAC, JWT auth, REST modules, and WebSocket gateways.

## Packages

- `packages/ui`: Reusable React component system.
- `packages/types`: Shared domain contracts.
- `packages/utils`: Shared formatting, status, and business helpers.
- `packages/config`: Shared TypeScript, ESLint, Tailwind, and Prettier config base.

## Local Development

```bash
pnpm install
pnpm dev
pnpm dev:api
```

Copy `.env.example` files in each app before connecting PostgreSQL, Redis, and OAuth providers.
