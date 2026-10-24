import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiDocument } from "./openapi.js";

export const DOCS_PATH = "/api-docs";
export const DOCS_JSON_PATH = "/api-docs.json";

/** Swagger UI lives outside /api/v1 so it has its own URL and can be switched off per environment. */
export function createDocsRouter() {
  const router = Router();
  const document = buildOpenApiDocument("/api/v1") as unknown as Record<string, unknown>;

  // Swagger UI needs inline scripts/styles, so relax the CSP for this router only.
  router.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
        },
      },
    }),
  );
  router.get(DOCS_JSON_PATH, (_request, response) => {
    response.json(document);
  });
  router.use(
    DOCS_PATH,
    swaggerUi.serve,
    swaggerUi.setup(document, { customSiteTitle: "CommerceFlow API docs" }),
  );
  return router;
}
