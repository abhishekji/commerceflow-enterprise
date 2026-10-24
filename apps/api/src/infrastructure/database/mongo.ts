import mongoose from "mongoose";
import { env } from "../../config/env.js";

export async function connectMongoDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  });

  console.log("MongoDB connected successfully");
}

export async function disconnectMongoDB(): Promise<void> {
  await mongoose.disconnect();
}