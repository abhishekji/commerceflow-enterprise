import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createSessionToken, setSessionCookie, clearSessionCookie, readSessionIdentity } from "../../middleware/auth.js";
import { Tenant } from "../tenants/tenant.model.js";
import { User } from "./user.model.js";

const loginSchema = z.object({
  tenantSlug: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});
const dummyPasswordHash = bcrypt.hashSync(randomBytes(32).toString("hex"), 12);

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const registerSchema = z.object({
  tenantName: z.string().trim().min(1).max(120),
  tenantSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/),
  defaultCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("USD"),
  timeZone: z.string().trim().max(60).refine(isValidTimeZone).default("UTC"),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(200),
});

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function register(request: Request, response: Response, next: NextFunction) {
  let tenantId: string | undefined;
  try {
    const input = registerSchema.parse(request.body);

    if (await Tenant.exists({ slug: input.tenantSlug })) {
      response.status(409).json({ error: { code: "TENANT_SLUG_TAKEN" } });
      return;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const tenant = await Tenant.create({
      name: input.tenantName,
      slug: input.tenantSlug,
      defaultCurrency: input.defaultCurrency,
      timeZone: input.timeZone,
    });
    tenantId = tenant._id.toString();

    const user = await User.create({
      tenantId: tenant._id,
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: "TENANT_ADMIN",
      status: "ACTIVE",
    });
    await Tenant.updateOne({ _id: tenant._id }, { createdBy: user._id });

    setSessionCookie(response, createSessionToken(user._id.toString(), tenantId));
    response.status(201).json({
      data: {
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tenant: {
          id: tenantId,
          name: tenant.name,
          defaultCurrency: tenant.defaultCurrency,
          timeZone: tenant.timeZone,
        },
      },
    });
  } catch (error) {
    if (tenantId) {
      await User.deleteMany({ tenantId }).catch(() => undefined);
      await Tenant.deleteOne({ _id: tenantId }).catch(() => undefined);
    }
    if (isDuplicateKeyError(error)) {
      response.status(409).json({ error: { code: "TENANT_SLUG_TAKEN" } });
      return;
    }
    next(error);
  }
}

export async function login(request: Request, response: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(request.body);
    const tenant = await Tenant.findOne({
      slug: input.tenantSlug.toLowerCase(),
      status: "ACTIVE",
    })
      .select("_id name defaultCurrency timeZone")
      .lean();

    const user = tenant
      ? await User.findOne({
          tenantId: tenant._id,
          email: input.email.toLowerCase(),
          status: "ACTIVE",
        })
          .select("+passwordHash _id tenantId firstName lastName role tokenVersion")
          .lean()
      : null;
    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? dummyPasswordHash,
    );

    if (!tenant || !user || !passwordMatches) {
      response.status(401).json({ error: { code: "INVALID_CREDENTIALS" } });
      return;
    }

    setSessionCookie(
      response,
      createSessionToken(user._id.toString(), tenant._id.toString(), user.tokenVersion ?? 0),
    );
    response.json({
      data: {
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tenant: {
          id: tenant._id.toString(),
          name: tenant.name,
          defaultCurrency: tenant.defaultCurrency,
          timeZone: tenant.timeZone,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const { tenantId, userId } = request.auth!;
    const [user, tenant] = await Promise.all([
      User.findOne({ _id: userId, tenantId })
        .select("_id firstName lastName role")
        .lean(),
      Tenant.findOne({ _id: tenantId }).select("_id name defaultCurrency timeZone").lean(),
    ]);

    if (!user || !tenant) {
      response.status(401).json({ error: { code: "UNAUTHENTICATED" } });
      return;
    }

    response.json({
      data: {
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tenant: {
          id: tenant._id.toString(),
          name: tenant.name,
          defaultCurrency: tenant.defaultCurrency,
          timeZone: tenant.timeZone,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(request: Request, response: Response, next: NextFunction) {
  try {
    const identity = readSessionIdentity(request);
    if (identity) {
      // Invalidates every token issued for this user, including copies of the cookie.
      await User.updateOne(
        { _id: identity.userId, tenantId: identity.tenantId },
        { $inc: { tokenVersion: 1 } },
      );
    }
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}
