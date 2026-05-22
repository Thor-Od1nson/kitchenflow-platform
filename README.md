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
npm install
npm run dev
npm run dev:api
```

Copy `.env.example` files in each app before connecting PostgreSQL, Redis, and OAuth providers.

## Vercel Frontend Deployment

Use the repository root as the Vercel project root so npm can install all workspaces.

- Install command: `npm install`
- Build command: `npm run build --workspace=@kitchenflow/web`
- Start command: `npm run start --workspace=@kitchenflow/web`
- Node.js version: `20.x`

Required frontend environment variables:

- `NEXT_PUBLIC_API_URL`: Public URL of the KitchenFlow API, including `/v1`. Use `http://localhost:4000/v1` for local development.
