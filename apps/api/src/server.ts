import { app } from "./app.js";
import { env } from "./config/env.js";
import { startWorkers } from "./workers/index.js";
import {
  connectMongoDB,
  disconnectMongoDB
} from "./infrastructure/database/mongo.js";

async function main() {
  await connectMongoDB();
  const stopWorkers = env.WORKERS_ENABLED ? startWorkers() : undefined;

  const server = app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
  });

  const shutdown = () => {
    server.close(async (error) => {
      try {
        await stopWorkers?.();
        await disconnectMongoDB();
      } finally {
        process.exit(error ? 1 : 0);
      }
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

main().catch((error) => {
  console.error("Application startup failed:", error);
  process.exit(1);
});