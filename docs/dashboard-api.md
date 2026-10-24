# Dashboard API

Dashboard requests use the authenticated user's tenant; clients cannot select a
tenant in query parameters. All endpoints are under `/api/v1`.

## Authentication and setup

Configure `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and
`WEB_ORIGIN` (one exact origin, default `http://localhost:5173`). The API
authenticates with an eight-hour, `HttpOnly`, `SameSite=Strict` session cookie.
Production cookies are marked `Secure`. Create tenant and active user records
through the restricted bootstrap CLI or the self-service `POST /auth/register`
endpoint (used by the web app's registration screen). Set `BOOTSTRAP_TENANT_NAME`, `BOOTSTRAP_TENANT_SLUG`,
`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (at least 14 characters),
`BOOTSTRAP_ADMIN_FIRST_NAME`, and `BOOTSTRAP_ADMIN_LAST_NAME`, then run
`npm run bootstrap:tenant-admin`. It creates the tenant if it does not exist and
refuses to create a second active tenant administrator. Database transactions
must be enabled (MongoDB replica set or Atlas).

The web app accepts `VITE_API_BASE_URL` at build time and defaults to
`http://localhost:3000/api/v1`.

## Routes

| Method and path | Purpose |
| --- | --- |
| `POST /auth/register` | Accepts `{ "tenantName", "tenantSlug", "defaultCurrency"?, "timeZone"?, "firstName", "lastName", "email", "password" }` (password 12–200 characters). Creates the tenant and its `TENANT_ADMIN` user, signs the user in, and returns `201` with the profile. Returns `409 TENANT_SLUG_TAKEN` if the slug exists. |
| `POST /auth/login` | Accepts `{ "tenantSlug", "email", "password" }`; sets the session cookie and returns the user/tenant display profile. |
| `GET /auth/me` | Returns the current user and tenant for session restoration. |
| `POST /auth/logout` | Revokes the user's session server-side (increments the user's `tokenVersion`, so all previously issued tokens return `401`), clears the session cookie, and returns `204`. Idempotent; works without a session. |
| `GET /dashboard/filters` | Returns the active tenant's currency, timezone, and active warehouses. |
| `GET /dashboard/summary` | Returns tenant-scoped KPIs, available inventory actions, and status-derived delivery counts. |
| `GET /dashboard/summary?warehouseId=<ObjectId>` | Applies a warehouse filter to matching orders and inventory; rejects warehouses outside the current tenant. |
| `GET /dashboard/timeseries` | Returns monthly order counts and default-currency revenue for the rolling 12 months, with same-month-prior-year comparisons. |
| `GET /dashboard/timeseries?warehouseId=<ObjectId>` | Applies the same tenant-validated warehouse filter. |

All dashboard endpoints require an active non-customer user. The session is
revalidated against the user and tenant records on every request so suspension
or tenant closure takes effect immediately. Login and logout requests must
originate from the configured web origin.

## Metric limitations

Order counts, average order value, returning-customer percentages, inventory
positions, and order status counts are computed from current MongoDB records.
Periods follow the tenant timezone. Revenue is limited to the tenant's default
currency; cancelled orders are excluded from average order value and revenue.

COD, lost-COD, shipment-return, courier, AWB, vendor-validation, and announcement
data are not modeled yet. Their dashboard values are returned as `null` or
shown as unavailable rather than fabricated. Store filtering is omitted because
there is no store collection or order-store relationship.

## Browser/security notes

The API restricts CORS to `WEB_ORIGIN`, uses credentialed requests, Helmet,
bounded JSON request bodies, request IDs, generic authentication failures, and
redacts session cookies from HTTP logs. Apply a shared rate limit to
`POST /auth/login` at the edge/reverse proxy in multi-instance deployments.
