// Runs before any test file imports application code, so config/env.ts sees these values.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
process.env.MONGODB_URI = process.env.TEST_MONGO_URI ?? "mongodb://127.0.0.1:27017/unused";
process.env.WEB_ORIGIN = "http://localhost:5173";
process.env.WORKERS_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.SWAGGER_ENABLED = "true";
delete process.env.AWS_SQS_QUEUE_URL;
