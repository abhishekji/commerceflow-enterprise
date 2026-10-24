import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet: MongoMemoryReplSet | undefined;

// One in-memory replica set (transactions need it) shared by every test file; each file uses its own database.
export async function setup() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.TEST_MONGO_URI = replSet.getUri();
}

export async function teardown() {
  await replSet?.stop();
}
