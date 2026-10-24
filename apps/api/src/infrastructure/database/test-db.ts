import mongoose from "mongoose";
import { connectMongoDB, disconnectMongoDB } from "./mongo.js";

async function test() {
  try {
    await connectMongoDB();

    const result = await mongoose.connection.db!.admin().ping();
    console.log("Ping result:", result);

    const collections = await mongoose.connection.db!
      .listCollections()
      .toArray();

    console.log("Collections:", collections.map(c => c.name));
  } finally {
    await disconnectMongoDB();
  }
}

test().catch(console.error);