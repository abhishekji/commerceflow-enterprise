import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

/** Connects to a private database on the shared in-memory replica set and builds all indexes. */
export async function connectTestDb() {
  const base = process.env.TEST_MONGO_URI;
  if (!base) throw new Error("TEST_MONGO_URI is not set; run tests through vitest.api.config.mjs");
  const dbName = `t_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await mongoose.connect(base.replace("/?", `/${dbName}?`));
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
