import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { env } from "../config/env.js";
import { Tenant } from "../modules/tenants/tenant.model.js";
import { User } from "../modules/identity/user.model.js";

const bootstrapSchema = z.object({
  BOOTSTRAP_TENANT_NAME: z.string().trim().min(1).max(120),
  BOOTSTRAP_TENANT_SLUG: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/),
  BOOTSTRAP_ADMIN_EMAIL: z.string().trim().email().max(254),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(14).max(200),
  BOOTSTRAP_ADMIN_FIRST_NAME: z.string().trim().min(1).max(80),
  BOOTSTRAP_ADMIN_LAST_NAME: z.string().trim().min(1).max(80),
});

async function bootstrap() {
  const input = bootstrapSchema.parse(process.env);
  await mongoose.connect(env.MONGODB_URI);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      let tenant = await Tenant.findOne({ slug: input.BOOTSTRAP_TENANT_SLUG }).session(session);
      if (!tenant) {
        tenant = new Tenant({
          name: input.BOOTSTRAP_TENANT_NAME,
          slug: input.BOOTSTRAP_TENANT_SLUG,
        });
        await tenant.save({ session });
      }

      const existingAdmin = await User.exists({
        tenantId: tenant._id,
        role: "TENANT_ADMIN",
        status: "ACTIVE",
      }).session(session);
      if (existingAdmin) throw new Error("An active tenant administrator already exists");

      const passwordHash = await bcrypt.hash(input.BOOTSTRAP_ADMIN_PASSWORD, 12);
      await User.create(
        [
          {
            tenantId: tenant._id,
            email: input.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
            passwordHash,
            firstName: input.BOOTSTRAP_ADMIN_FIRST_NAME,
            lastName: input.BOOTSTRAP_ADMIN_LAST_NAME,
            role: "TENANT_ADMIN",
            status: "ACTIVE",
          },
        ],
        { session },
      );
      console.info(`Administrator created for tenant "${input.BOOTSTRAP_TENANT_SLUG}".`);
    });
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(
    error instanceof z.ZodError
      ? `Invalid bootstrap configuration: ${error.issues.map((issue) => issue.path.join(".")).join(", ")}`
      : "Tenant administrator bootstrap failed.",
  );
  process.exitCode = 1;
});
