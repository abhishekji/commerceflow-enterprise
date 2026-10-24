# CommerceFlow Enterprise

CommerceFlow Enterprise is a multi-tenant commerce and fulfillment operations
application. It includes a React dashboard and a Node.js API for tenant
authentication, dashboard reporting, and order checkout. Tenant-owned data is
scoped in MongoDB.

## Features

- Tenant-scoped users, products, warehouses, inventory, and orders.
- Session-based authentication using an eight-hour `HttpOnly` cookie.
- Dashboard KPIs, warehouse filtering, and rolling 12-month order and revenue
  time series.
- Order checkout with validated product and warehouse IDs and bounded item
  quantities.
- Persistence models for idempotency keys, audit logs, outbox events, and
  integration jobs.
- Self-service registration of a tenant and its first administrator, plus a
  restricted CLI for bootstrapping one from the command line.

Some dashboard metrics and navigation areas depend on courier, shipment,
payment, store, or announcement data that is not modeled yet. Those metrics are
shown as unavailable rather than estimated. See
[Dashboard API](./docs/dashboard-api.md) for the current limitations.

## Technology

- **Frontend:** React 19, Vite
- **API:** Node.js, Express 5, TypeScript
- **Database:** MongoDB with Mongoose
- **Validation:** Zod
- **Authentication:** bcryptjs and JSON Web Tokens

## Requirements

- Node.js and npm
- MongoDB
- A MongoDB replica set or MongoDB Atlas deployment for workflows that use
  transactions, including initial administrator bootstrap and checkout

## Getting started

1. Install dependencies:

   ```sh
   npm install --legacy-peer-deps
   ```

   (`--legacy-peer-deps` is needed because of an existing ts-jest/TypeScript peer conflict.)

2. Copy the example environment file in the repository root:

   ```powershell
   Copy-Item .env.example .env
   ```

   Edit `.env` and set `MONGODB_URI` to your MongoDB connection string and
   `JWT_SECRET` to a private random value of at least 32 characters. The example
   secret is only a placeholder and must be replaced. `MONGODB_URI` and
   `JWT_SECRET` are required. `PORT` defaults to `3000`, `NODE_ENV` to
   `development`, and `WEB_ORIGIN` to `http://localhost:5173`. `WEB_ORIGIN`
   must be one exact origin, without a path.

3. Configure the frontend API URL if it differs from the default. Vite reads
   frontend environment files from `apps/web`; create
   `apps/web/.env.local`:

   ```dotenv
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   ```

   The frontend defaults to `http://localhost:3000/api/v1` when this variable
   is not set.

4. Create the initial tenant and administrator. The simplest way is the
   registration screen in the web app ("Create an account"). Alternatively, use
   the CLI by adding these values to the
   repository-root `.env` file:

   ```dotenv
   BOOTSTRAP_TENANT_NAME=Example Organization
   BOOTSTRAP_TENANT_SLUG=example-organization
   BOOTSTRAP_ADMIN_EMAIL=admin@example.com
   BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-strong-password
   BOOTSTRAP_ADMIN_FIRST_NAME=Example
   BOOTSTRAP_ADMIN_LAST_NAME=Admin
   ```

   The bootstrap password must be at least 14 characters. Run the command once
   the database is available:

   ```sh
   npm run bootstrap:tenant-admin
   ```

   The command creates the tenant if it does not exist and refuses to create a
   second active tenant administrator for that tenant. Keep `.env` and real
   credentials private.

5. Start the API and frontend in separate terminals:

   ```sh
   npm run dev
   ```

   ```sh
   npm run dev:web
   ```

   Open [http://localhost:5173](http://localhost:5173). The API listens on port
   `3000` by default.

## Environment variables

| Variable | Required | Default / notes |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | At least 32 characters; use a random secret. |
| `NODE_ENV` | No | `development`; supports `development`, `test`, or `production`. |
| `PORT` | No | `3000`. |
| `WEB_ORIGIN` | No | `http://localhost:5173`; one exact origin used for CORS and trusted-origin checks. |
| `VITE_API_BASE_URL` | No | Frontend build-time setting; defaults to `http://localhost:3000/api/v1`. Configure in `apps/web/.env.local` for local development. |
| `REDIS_URL` | No | Optional API configuration value; not currently used by the implemented request flows. |
| `AWS_REGION` | No | Defaults to `ap-south-1`; not currently used by the implemented request flows. |
| `AWS_SQS_QUEUE_URL` | No | If set, outbox events are published to and consumed from this SQS queue; otherwise an in-process queue is used. |
| `WORKERS_ENABLED` | No | Run the outbox publisher and event worker inside the API process. Defaults to `true`. |
| `SWAGGER_ENABLED` | No | Serve Swagger UI. Defaults to `true` outside production and `false` in production. |
| `LOG_LEVEL` | No | pino log level; defaults to `info` (tests use `silent`). |

The bootstrap CLI additionally requires `BOOTSTRAP_TENANT_NAME`,
`BOOTSTRAP_TENANT_SLUG`, `BOOTSTRAP_ADMIN_EMAIL`,
`BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_FIRST_NAME`, and
`BOOTSTRAP_ADMIN_LAST_NAME`.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API in watch mode. |
| `npm run dev:web` | Start the Vite development server. |
| `npm run bootstrap:tenant-admin` | Create a tenant and its first active administrator from the bootstrap environment variables. |
| `npm run build` | Type-check and compile the API into `dist`. |
| `npm run build:web` | Build the frontend into `dist/web`. |
| `npm run typecheck:web` | Type-check the React app. |
| `npm run test:api` | Run backend unit and integration tests (Vitest + supertest + in-memory MongoDB). |
| `npm run test:web` | Run the frontend unit tests (Vitest + Testing Library). |
| `npm run test:api:coverage` / `npm run test:web:coverage` | Same suites with V8 coverage. |
| `npm run test:coverage` | Coverage for both. |
| `npm start` | Start the compiled API (`dist/server.js`); run `npm run build` first. |
| `npm test` | Run backend and frontend tests. |

The API and frontend build separately. To build both for deployment:

```sh
npm run build
npm run build:web
```

The API server does not serve the frontend build; deploy the API and static
frontend using the hosting setup appropriate to your environment. The SPA uses
`BrowserRouter`, so the static host must rewrite unknown paths to `index.html`
(Vite's dev server already does this).

## Testing, coverage and API docs

Backend tests live in `apps/api/tests` (outside `src`, so they are not compiled into `dist`):

- `unit/` - isolated tests for middleware, config, message bus, order/payment logic, OpenAPI spec.
- `integration/` - HTTP tests through the real Express app with supertest.
- `setup/` and `helpers/` - env setup, a shared in-memory MongoDB **replica set** (needed for transactions; the first run uses or downloads a cached mongod binary), and data factories.

Frontend tests sit next to their components as `*.test.tsx`.

Coverage reports are written to `coverage/api` and `coverage/web` (open `index.html`; `lcov.info` is also produced). The backend config enforces minimum thresholds in `vitest.api.config.mjs`.

**Swagger UI** is served separately from the API at `http://localhost:3000/api-docs` and the raw OpenAPI JSON at `/api-docs.json`. It is disabled by default in production; set `SWAGGER_ENABLED=true` to enable it. Sign in via `POST /auth/login` in Swagger UI; the session cookie is then sent automatically.
## Frontend structure

```text
apps/web/src
├── common/        enums/ types/ constants/ styles/   shared enums, models, constants, global SCSS
├── components/    <Name>/ Name.tsx, Name.scss, Name.test.tsx, index.ts
├── pages/         <Name>/ NamePage.tsx, NamePage.scss, NamePage.test.tsx, index.ts
├── layouts/       AppLayout (sidebar, topbar, <Outlet/>)
├── routes/        AppRoutes (lazy pages), ProtectedRoute / PublicOnlyRoute guards
├── context/       AuthContext, NoticeContext
├── services/      typed API wrappers (auth, catalog, orders, payments, dashboard)
├── hooks/  utils/ usePolling; apiClient, formatters, error helpers
└── test/          Vitest setup
```

| Route | Page |
| --- | --- |
| `/login`, `/register` | Public-only auth screens |
| `/dashboard` | Dashboard (default) |
| `/shop` | Browse products and check out |
| `/orders` | Orders and tracking |
| `/orders/:orderId/pay` | Dummy payment step |
| `/inventory` | Inventory (admin/manager) |

Unauthenticated users are redirected to `/login` and returned to the requested
page after signing in.

## API overview

All API routes are under `/api/v1`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness response. |
| `POST` | `/auth/register` | Create a tenant and its administrator, then sign in; sets the session cookie. |
| `POST` | `/auth/login` | Authenticate using `tenantSlug`, `email`, and `password`; sets the session cookie. |
| `GET` | `/auth/me` | Restore the authenticated user and tenant profile. |
| `POST` | `/auth/logout` | Revoke the user's sessions and clear the session cookie. |
| `GET` | `/dashboard/filters` | Get tenant currency, timezone, and active warehouses. |
| `GET` | `/dashboard/summary` | Get tenant-scoped dashboard metrics; accepts an optional validated `warehouseId`. |
| `GET` | `/dashboard/timeseries` | Get monthly order counts and default-currency revenue; accepts an optional validated `warehouseId`. |
| `GET` | `/catalog/warehouses` | List warehouses. |
| `POST` | `/catalog/warehouses` | Create a warehouse (admin/manager). |
| `GET` | `/catalog/products?warehouseId=` | Browse products with sellable stock (`available - reserved`). |
| `POST` | `/catalog/products` | Create a product (admin/manager). |
| `GET` / `PUT` | `/catalog/inventory` | View / set stock per warehouse (admin/manager); stock cannot go below reserved. |
| `GET` | `/orders` | List orders (customers see only their own), with shipment tracking. |
| `POST` | `/orders` | Checkout: validate price and stock, reserve inventory, create the order and outbox event in one transaction. |
| `GET` | `/orders/:id` | Fetch one order (tenant-scoped; customers only see their own). |
| `POST` | `/orders/:id/transition` | Move an order through its lifecycle; customers may only cancel their own pending/confirmed orders. |
| `GET` | `/notifications` | The signed-in user's latest notifications. |
| `GET` | `/payments/methods` | Available (dummy) payment methods and sandbox test hints. |
| `POST` | `/payments/orders/:id/pay` | Pay for the caller's own pending order using `CARD`, `UPI`, `NET_BANKING`, `WALLET` or `COD`. |

Dashboard endpoints require an authenticated, active non-customer user. Order
creation requires authentication and accepts a `warehouseId` and a non-empty
`items` array containing `productId` and integer `quantity` values from 1 to
100. Login and logout requests must originate from `WEB_ORIGIN`.

### Order-to-delivery flow

1. Login issues a JWT in an HttpOnly cookie; every request validates the token, role and tenant.
2. Browse products (`/catalog/products`) and check out (`POST /orders`). Checkout runs in a Mongo transaction, so it **requires a replica set** (e.g. Atlas).
3. The order starts `PENDING` / `UNPAID` with stock reserved, and an `order.created` outbox event is written in the same transaction. The UI then opens the **payment step**.
4. The customer pays with `POST /payments/orders/:id/pay`. On success the order becomes `PAID` (or `COD` for pay-on-delivery) and a `payment.succeeded` outbox event is written atomically. A declined payment leaves the order unpaid so another method can be tried; it can also be paid later via **Pay now** in All Orders.
5. The outbox publisher sends events to SQS when `AWS_SQS_QUEUE_URL` is set, otherwise to an in-process queue.
6. The background worker (`WORKERS_ENABLED`, default `true`) notifies the customer and, on `payment.succeeded`, confirms the order and creates a shipment with a tracking number. **An unpaid order is never confirmed**, not even manually (`PAYMENT_REQUIRED`).
7. Staff move the order `CONFIRMED → FULFILLING → SHIPPED → DELIVERED`. Shipping decrements stock and reserved; cancelling releases the reservation. Each change emits an event, notification and audit entry.

### Payments (dummy gateway)

No money is ever charged. The gateway is simulated in `apps/api/src/modules/payments`:

- Card: any Luhn-valid number with a future expiry succeeds (e.g. `4242 4242 4242 4242`); a number ending `0002` (e.g. `4000 0000 0000 0002`) is declined. UPI IDs starting with `fail` are declined. Net banking, wallet and pay-on-delivery always succeed.
- Only masked details (e.g. `Visa •••• 4242`) and a payment reference are stored; card numbers and CVVs are never persisted or logged.
- Every attempt, including declines, is recorded in the `payments` collection and the audit log.
- Cancelling a paid order triggers a dummy refund (`REFUNDED`, with a refund reference) and releases the stock. Pay-on-delivery orders are marked paid when delivered.

The courier and notification delivery are simulated (in-app notifications and
a stub carrier job); no real courier or email provider is integrated.

For full request behavior, metric definitions, and known limitations, see
[Dashboard API](./docs/dashboard-api.md).

## Data model and tenant boundaries

The MongoDB collections include tenants, users, products, warehouses,
inventory, orders, idempotency keys, outbox events, audit logs, and integration
jobs. Tenant-owned records include a `tenantId`; application queries and
uniqueness constraints should remain tenant-scoped. Mongoose schema indexes
must be created by the deployment's migration or startup process before relying
on uniqueness or TTL behavior.

See [Data model](./docs/data-model.md) for collection relationships and index
notes.

## Security and deployment notes

- Session cookies are `HttpOnly` and `SameSite=Strict`; they are marked `Secure`
  in production.
- The API restricts credentialed CORS requests to the configured
  `WEB_ORIGIN`, uses Helmet, limits JSON request bodies, assigns request IDs,
  and redacts cookies and authorization headers from HTTP logs.
- User passwords are hashed; tenant boundaries are checked against the
  authenticated session.
- Apply shared rate limiting to `POST /auth/login` and `POST /auth/register` at the edge or reverse proxy
  when running multiple API instances.
- Set production secrets and environment values in your deployment platform,
  not in committed files.
