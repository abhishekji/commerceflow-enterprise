type JsonObject = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const objectId = { type: "string", pattern: "^[a-f\\d]{24}$", example: "65a1b2c3d4e5f60718293a4b" };
const dataEnvelope = (schema: JsonObject) => ({
  type: "object",
  properties: { data: schema },
  required: ["data"],
});
const json = (schema: JsonObject) => ({ "application/json": { schema } });
const jsonBody = (schema: JsonObject) => ({ required: true, content: json(schema) });
const errorResponse = (description: string) => ({
  description,
  content: json(ref("ErrorResponse")),
});
const pathId = {
  name: "id",
  in: "path",
  required: true,
  schema: objectId,
};

const orderStatuses = ["PENDING", "CONFIRMED", "FULFILLING", "SHIPPED", "DELIVERED", "CANCELLED"];
const roles = ["TENANT_ADMIN", "FULFILLMENT_MANAGER", "STAFF", "CUSTOMER"];

const secured = [{ cookieAuth: [] }];
const commonErrors = {
  "400": errorResponse("Validation error"),
  "401": errorResponse("Missing, expired or revoked session"),
  "403": errorResponse("Role not permitted or untrusted origin"),
};

export function buildOpenApiDocument(serverUrl = "/"): JsonObject {
  return {
    openapi: "3.0.3",
    info: {
      title: "CommerceFlow Enterprise API",
      version: "1.0.0",
      description:
        "Multi-tenant commerce API: authentication, catalog, checkout, dummy payments, order fulfillment, " +
        "notifications and dashboard metrics. Authentication uses an HttpOnly session cookie issued by " +
        "`/auth/login` or `/auth/register`; in Swagger UI, call login first and the browser sends the cookie " +
        "automatically. All responses are wrapped as `{ data }` or `{ error: { code } }`.",
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Catalog" },
      { name: "Orders" },
      { name: "Payments" },
      { name: "Notifications" },
      { name: "Dashboard" },
      { name: "AI" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Liveness and database status",
          responses: {
            "200": { description: "Service and database are up", content: json(ref("Health")) },
            "503": { description: "Database disconnected", content: json(ref("Health")) },
          },
        },
      },
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Create a tenant and its administrator, then sign in",
          requestBody: jsonBody(ref("RegisterRequest")),
          responses: {
            "201": { description: "Registered; session cookie set", content: json(dataEnvelope(ref("Session"))) },
            "400": errorResponse("Validation error"),
            "403": errorResponse("Untrusted origin"),
            "409": errorResponse("TENANT_SLUG_TAKEN"),
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Sign in with tenant slug, email and password",
          requestBody: jsonBody(ref("LoginRequest")),
          responses: {
            "200": { description: "Signed in; session cookie set", content: json(dataEnvelope(ref("Session"))) },
            "400": errorResponse("Validation error"),
            "401": errorResponse("INVALID_CREDENTIALS"),
            "403": errorResponse("Untrusted origin"),
          },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current user and tenant",
          security: secured,
          responses: {
            "200": { description: "Active session", content: json(dataEnvelope(ref("Session"))) },
            "401": errorResponse("Unauthenticated"),
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Revoke every token of the user and clear the session cookie",
          responses: {
            "204": { description: "Signed out" },
            "403": errorResponse("Untrusted origin"),
          },
        },
      },
      "/catalog/warehouses": {
        get: {
          tags: ["Catalog"],
          summary: "List active warehouses",
          security: secured,
          responses: {
            "200": { description: "Warehouses", content: json(dataEnvelope({ type: "array", items: ref("Warehouse") })) },
            "401": errorResponse("Unauthenticated"),
          },
        },
        post: {
          tags: ["Catalog"],
          summary: "Create a warehouse (TENANT_ADMIN, FULFILLMENT_MANAGER)",
          security: secured,
          requestBody: jsonBody(ref("WarehouseRequest")),
          responses: {
            "201": { description: "Created", content: json(dataEnvelope(ref("Warehouse"))) },
            ...commonErrors,
            "409": errorResponse("WAREHOUSE_CODE_TAKEN"),
          },
        },
      },
      "/catalog/products": {
        get: {
          tags: ["Catalog"],
          summary: "Browse products with sellable stock (available - reserved)",
          security: secured,
          parameters: [
            { name: "warehouseId", in: "query", schema: objectId },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 100 } },
          ],
          responses: {
            "200": { description: "Products", content: json(dataEnvelope({ type: "array", items: ref("Product") })) },
            "400": errorResponse("Validation error"),
            "401": errorResponse("Unauthenticated"),
          },
        },
        post: {
          tags: ["Catalog"],
          summary: "Create a product (TENANT_ADMIN, FULFILLMENT_MANAGER)",
          security: secured,
          requestBody: jsonBody(ref("ProductRequest")),
          responses: {
            "201": {
              description: "Created",
              content: json(dataEnvelope({
                type: "object",
                properties: { id: objectId, sku: { type: "string" }, name: { type: "string" } },
              })),
            },
            ...commonErrors,
            "409": errorResponse("SKU_TAKEN"),
          },
        },
      },
      "/catalog/inventory": {
        get: {
          tags: ["Catalog"],
          summary: "View stock per product and warehouse (managers)",
          security: secured,
          responses: {
            "200": { description: "Stock rows", content: json(dataEnvelope({ type: "array", items: ref("InventoryRow") })) },
            "401": errorResponse("Unauthenticated"),
            "403": errorResponse("Forbidden"),
          },
        },
        put: {
          tags: ["Catalog"],
          summary: "Set available stock; cannot go below reserved (managers)",
          security: secured,
          requestBody: jsonBody(ref("StockRequest")),
          responses: {
            "200": { description: "Stock set", content: json(dataEnvelope(ref("StockRequest"))) },
            ...commonErrors,
            "404": errorResponse("PRODUCT_OR_WAREHOUSE_NOT_FOUND"),
            "409": errorResponse("STOCK_BELOW_RESERVED"),
          },
        },
      },
      "/orders": {
        get: {
          tags: ["Orders"],
          summary: "List orders (customers only see their own)",
          security: secured,
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: orderStatuses } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
          ],
          responses: {
            "200": { description: "Orders", content: json(dataEnvelope({ type: "array", items: ref("Order") })) },
            "400": errorResponse("Validation error"),
            "401": errorResponse("Unauthenticated"),
          },
        },
        post: {
          tags: ["Orders"],
          summary: "Checkout: validate price and stock, reserve inventory, create order and outbox event transactionally",
          security: secured,
          requestBody: jsonBody(ref("CheckoutRequest")),
          responses: {
            "201": { description: "Order created (PENDING, UNPAID)", content: json(dataEnvelope(ref("Order"))) },
            ...commonErrors,
            "404": errorResponse("WAREHOUSE_NOT_FOUND"),
            "409": errorResponse("INSUFFICIENT_INVENTORY"),
          },
        },
      },
      "/orders/{id}": {
        get: {
          tags: ["Orders"],
          summary: "Fetch one order",
          security: secured,
          parameters: [pathId],
          responses: {
            "200": { description: "Order", content: json(dataEnvelope(ref("Order"))) },
            "400": errorResponse("Invalid identifier"),
            "401": errorResponse("Unauthenticated"),
            "404": errorResponse("ORDER_NOT_FOUND"),
          },
        },
      },
      "/orders/{id}/transition": {
        post: {
          tags: ["Orders"],
          summary: "Move an order through its lifecycle (customers may only cancel their own pending/confirmed orders)",
          security: secured,
          parameters: [pathId],
          requestBody: jsonBody({
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: orderStatuses } },
          }),
          responses: {
            "200": { description: "Updated order", content: json(dataEnvelope(ref("Order"))) },
            ...commonErrors,
            "404": errorResponse("ORDER_NOT_FOUND"),
            "409": errorResponse("INVALID_ORDER_TRANSITION, PAYMENT_REQUIRED or ORDER_CHANGED"),
          },
        },
      },
      "/payments/methods": {
        get: {
          tags: ["Payments"],
          summary: "Dummy payment methods and sandbox test hints",
          security: secured,
          responses: {
            "200": { description: "Methods", content: json(dataEnvelope(ref("PaymentMethods"))) },
            "401": errorResponse("Unauthenticated"),
          },
        },
      },
      "/payments/orders/{id}/pay": {
        post: {
          tags: ["Payments"],
          summary: "Pay for an order with the dummy gateway (nothing is charged)",
          description:
            "Card `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined, a UPI ID starting with `fail` is declined.",
          security: secured,
          parameters: [pathId],
          requestBody: jsonBody(ref("PaymentRequest")),
          responses: {
            "200": {
              description: "Paid (or pay-on-delivery confirmed)",
              content: json(dataEnvelope({
                type: "object",
                properties: { order: ref("Order"), reference: { type: "string", example: "PAY-1A2B3C" } },
              })),
            },
            ...commonErrors,
            "402": errorResponse("PAYMENT_DECLINED"),
            "404": errorResponse("ORDER_NOT_FOUND"),
            "409": errorResponse("Order is not payable"),
          },
        },
      },
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "Latest 30 notifications of the signed-in user",
          security: secured,
          responses: {
            "200": { description: "Notifications", content: json(dataEnvelope({ type: "array", items: ref("Notification") })) },
            "401": errorResponse("Unauthenticated"),
          },
        },
      },
      "/dashboard/filters": {
        get: {
          tags: ["Dashboard"],
          summary: "Tenant currency, time zone and active warehouses (non-customers)",
          security: secured,
          responses: {
            "200": { description: "Filters", content: json(dataEnvelope({ type: "object" })) },
            "401": errorResponse("Unauthenticated"),
            "403": errorResponse("Forbidden"),
          },
        },
      },
      "/dashboard/summary": {
        get: {
          tags: ["Dashboard"],
          summary: "Tenant-scoped dashboard metrics",
          security: secured,
          parameters: [{ name: "warehouseId", in: "query", schema: objectId }],
          responses: {
            "200": { description: "Summary", content: json(dataEnvelope({ type: "object" })) },
            "400": errorResponse("Validation error"),
            "401": errorResponse("Unauthenticated"),
            "403": errorResponse("Forbidden"),
          },
        },
      },
      "/dashboard/timeseries": {
        get: {
          tags: ["Dashboard"],
          summary: "Monthly order counts and revenue",
          security: secured,
          parameters: [{ name: "warehouseId", in: "query", schema: objectId }],
          responses: {
            "200": { description: "Timeseries", content: json(dataEnvelope({ type: "object" })) },
            "400": errorResponse("Validation error"),
            "401": errorResponse("Unauthenticated"),
            "403": errorResponse("Forbidden"),
          },
        },
      },
      "/ai/chat": {
        post: {
          tags: ["AI"],
          summary: "Ask the AI assistant a question grounded in the tenant's catalog and metrics",
          security: secured,
          requestBody: jsonBody({
            type: "object",
            required: ["messages"],
            properties: {
              messages: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                description: "Conversation so far; the last message must be from the user",
                items: {
                  type: "object",
                  required: ["role", "content"],
                  properties: {
                    role: { type: "string", enum: ["user", "assistant"] },
                    content: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          }),
          responses: {
            "200": { description: "Assistant reply", content: json(dataEnvelope({ type: "object", properties: { reply: { type: "string" } } })) },
            ...commonErrors,
            "429": errorResponse("Rate limited"),
            "502": errorResponse("OpenAI request failed"),
            "503": errorResponse("OPENAI_API_KEY is not configured"),
          },
        },
      },
      "/ai/insights": {
        post: {
          tags: ["AI"],
          summary: "AI-written highlights of the dashboard metrics (non-customers)",
          security: secured,
          requestBody: { content: json({ type: "object", properties: { warehouseId: objectId } }) },
          responses: {
            "200": { description: "Insights", content: json(dataEnvelope({ type: "object", properties: { insights: { type: "string" } } })) },
            ...commonErrors,
            "429": errorResponse("Rate limited"),
            "502": errorResponse("OpenAI request failed"),
            "503": errorResponse("OPENAI_API_KEY is not configured"),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "commerceflow_session" },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "object", properties: { code: { type: "string", example: "VALIDATION_ERROR" } } },
            requestId: { type: "string", format: "uuid" },
          },
        },
        Health: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["UP", "DOWN"] },
            database: { type: "string", enum: ["CONNECTED", "DISCONNECTED"] },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["tenantName", "tenantSlug", "firstName", "lastName", "email", "password"],
          properties: {
            tenantName: { type: "string", maxLength: 120, example: "Acme Retail" },
            tenantSlug: { type: "string", pattern: "^[a-z0-9-]{2,80}$", example: "acme" },
            defaultCurrency: { type: "string", pattern: "^[A-Z]{3}$", default: "USD" },
            timeZone: { type: "string", default: "UTC", example: "Asia/Kolkata" },
            firstName: { type: "string", example: "Ada" },
            lastName: { type: "string", example: "Lovelace" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 12, format: "password" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["tenantSlug", "email", "password"],
          properties: {
            tenantSlug: { type: "string", example: "acme" },
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
          },
        },
        Session: {
          type: "object",
          properties: {
            user: {
              type: "object",
              properties: {
                id: objectId,
                firstName: { type: "string" },
                lastName: { type: "string" },
                role: { type: "string", enum: roles },
              },
            },
            tenant: {
              type: "object",
              properties: {
                id: objectId,
                name: { type: "string" },
                defaultCurrency: { type: "string" },
                timeZone: { type: "string" },
              },
            },
          },
        },
        Warehouse: {
          type: "object",
          properties: { id: objectId, code: { type: "string", example: "MAIN" }, name: { type: "string" } },
        },
        WarehouseRequest: {
          type: "object",
          required: ["code", "name", "address"],
          properties: {
            code: { type: "string", pattern: "^[A-Z0-9-]{2,20}$", example: "MAIN" },
            name: { type: "string", example: "Main warehouse" },
            address: {
              type: "object",
              required: ["line1", "city", "postalCode", "countryCode"],
              properties: {
                line1: { type: "string" },
                city: { type: "string" },
                postalCode: { type: "string" },
                countryCode: { type: "string", minLength: 2, maxLength: 2, example: "IN" },
              },
            },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: objectId,
            sku: { type: "string" },
            name: { type: "string" },
            price: { type: "number", example: 12.5 },
            priceMinor: { type: "integer", example: 1250 },
            currency: { type: "string", example: "USD" },
            sellable: { type: "integer", minimum: 0 },
          },
        },
        ProductRequest: {
          type: "object",
          required: ["sku", "name", "price"],
          properties: {
            sku: { type: "string", maxLength: 64 },
            name: { type: "string", maxLength: 200 },
            price: { type: "number", minimum: 0 },
            currency: { type: "string", pattern: "^[A-Z]{3}$" },
          },
        },
        InventoryRow: {
          type: "object",
          properties: {
            productId: objectId,
            sku: { type: "string" },
            productName: { type: "string" },
            warehouseId: objectId,
            warehouseName: { type: "string" },
            available: { type: "integer" },
            reserved: { type: "integer" },
          },
        },
        StockRequest: {
          type: "object",
          required: ["warehouseId", "productId", "available"],
          properties: { warehouseId: objectId, productId: objectId, available: { type: "integer", minimum: 0 } },
        },
        CheckoutRequest: {
          type: "object",
          required: ["warehouseId", "items"],
          properties: {
            warehouseId: objectId,
            items: {
              type: "array",
              minItems: 1,
              maxItems: 50,
              items: {
                type: "object",
                required: ["productId", "quantity"],
                properties: { productId: objectId, quantity: { type: "integer", minimum: 1, maximum: 100 } },
              },
            },
          },
        },
        Order: {
          type: "object",
          properties: {
            id: objectId,
            status: { type: "string", enum: orderStatuses },
            paymentStatus: { type: "string", enum: ["UNPAID", "PAID", "COD", "REFUNDED"] },
            paymentMethod: { type: "string", nullable: true },
            paymentReference: { type: "string", nullable: true },
            paymentSummary: { type: "string", nullable: true },
            paidAt: { type: "string", format: "date-time", nullable: true },
            totalMinor: { type: "integer" },
            currency: { type: "string" },
            warehouseId: objectId,
            customerId: objectId,
            customerName: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: objectId,
                  sku: { type: "string" },
                  name: { type: "string" },
                  quantity: { type: "integer" },
                  unitPriceMinor: { type: "integer" },
                },
              },
            },
            shipment: { type: "object", nullable: true },
          },
        },
        PaymentMethods: {
          type: "object",
          properties: {
            methods: { type: "array", items: { type: "string", enum: ["CARD", "UPI", "NET_BANKING", "WALLET", "COD"] } },
            banks: { type: "array", items: { type: "string" } },
            wallets: { type: "array", items: { type: "string" } },
            sandbox: { type: "boolean" },
            testHints: { type: "object", additionalProperties: { type: "string" } },
          },
        },
        PaymentRequest: {
          oneOf: [
            {
              type: "object",
              required: ["method", "cardholderName", "cardNumber", "expiry", "cvv"],
              properties: {
                method: { type: "string", enum: ["CARD"] },
                cardholderName: { type: "string" },
                cardNumber: { type: "string", example: "4242 4242 4242 4242" },
                expiry: { type: "string", example: "12/30" },
                cvv: { type: "string", example: "123" },
              },
            },
            {
              type: "object",
              required: ["method", "upiId"],
              properties: { method: { type: "string", enum: ["UPI"] }, upiId: { type: "string", example: "ada@demo" } },
            },
            {
              type: "object",
              required: ["method", "bank"],
              properties: {
                method: { type: "string", enum: ["NET_BANKING"] },
                bank: { type: "string", enum: ["DEMO_BANK_A", "DEMO_BANK_B", "DEMO_BANK_C"] },
              },
            },
            {
              type: "object",
              required: ["method", "wallet"],
              properties: {
                method: { type: "string", enum: ["WALLET"] },
                wallet: { type: "string", enum: ["DEMO_WALLET", "DEMO_PAY"] },
              },
            },
            { type: "object", required: ["method"], properties: { method: { type: "string", enum: ["COD"] } } },
          ],
        },
        Notification: {
          type: "object",
          properties: {
            id: objectId,
            orderId: { ...objectId, nullable: true },
            type: { type: "string", example: "ORDER_CONFIRMED" },
            message: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  };
}
