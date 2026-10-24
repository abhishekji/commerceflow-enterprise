import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Tenant } from "../modules/tenants/tenant.model.js";
import { User } from "../modules/identity/user.model.js";

export interface AuthContext {
  tenantId: string;
  userId: string;
  role: "TENANT_ADMIN" | "FULFILLMENT_MANAGER" | "STAFF" | "CUSTOMER";
}

const sessionCookie = "commerceflow_session";

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function createSessionToken(userId: string, tenantId: string, tokenVersion = 0) {
  return jwt.sign({ tenantId, tv: tokenVersion }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: "8h",
    issuer: "commerceflow-api",
    audience: "commerceflow-web",
  });
}

export function setSessionCookie(response: Response, token: string) {
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; Path=/api/v1; SameSite=Strict; Max-Age=28800${secure}`,
  );
}

export function readSessionIdentity(request: Request) {
  const token = readCookie(request, sessionCookie);
  if (!token) return null;
  try {
    const claims = jwt.verify(token, env.JWT_SECRET, {
      issuer: "commerceflow-api",
      audience: "commerceflow-web",
    });
    if (
      typeof claims === "string" ||
      typeof claims.sub !== "string" ||
      typeof claims.tenantId !== "string" ||
      !mongoose.isValidObjectId(claims.sub) ||
      !mongoose.isValidObjectId(claims.tenantId)
    ) {
      return null;
    }
    return { userId: claims.sub, tenantId: claims.tenantId, tokenVersion: Number(claims.tv ?? 0) };
  } catch {
    return null;
  }
}

export function clearSessionCookie(response: Response) {
  const secure = env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Set-Cookie",
    `${sessionCookie}=; HttpOnly; Path=/api/v1; SameSite=Strict; Max-Age=0${secure}`,
  );
}

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const token = readCookie(request, sessionCookie);
    if (!token) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED" } });
      return;
    }

    const claims = jwt.verify(token, env.JWT_SECRET, {
      issuer: "commerceflow-api",
      audience: "commerceflow-web",
    });

    if (typeof claims === "string") {
      response.status(401).json({ error: { code: "UNAUTHENTICATED" } });
      return;
    }
    const tenantId = claims.tenantId;
    if (
      typeof claims.sub !== "string" ||
      typeof tenantId !== "string" ||
      !mongoose.isValidObjectId(claims.sub) ||
      !mongoose.isValidObjectId(tenantId)
    ) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED" } });
      return;
    }

    const [user, tenant] = await Promise.all([
      User.findOne({
        _id: claims.sub,
        tenantId,
        status: "ACTIVE",
      })
        .select("_id tenantId role tokenVersion")
        .lean(),
      Tenant.findOne({ _id: tenantId, status: "ACTIVE" })
        .select("_id")
        .lean(),
    ]);

    if (!user || !tenant || Number(claims.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED" } });
      return;
    }

    request.auth = {
      tenantId: user.tenantId.toString(),
      userId: user._id.toString(),
      role: user.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED" } });
      return;
    }
    next(error);
  }
}

export function requireRoles(...roles: AuthContext["role"][]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      response.status(403).json({ error: { code: "FORBIDDEN" } });
      return;
    }
    next();
  };
}

export function requireDashboardRole(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (request.auth?.role === "CUSTOMER") {
    response.status(403).json({ error: { code: "FORBIDDEN" } });
    return;
  }
  next();
}

export function requireTrustedOrigin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const origin = request.get("origin");
  if (origin && origin !== env.WEB_ORIGIN) {
    response.status(403).json({ error: { code: "INVALID_ORIGIN" } });
    return;
  }
  next();
}
