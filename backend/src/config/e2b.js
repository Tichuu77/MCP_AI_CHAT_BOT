
import "dotenv/config";
import { Sandbox } from "e2b";

export default async function createSandbox() {
  try {
    if (!process.env.E2B_API_KEY) {
      throw new Error("E2B_API_KEY is not set in the environment variables.");
    }

    return await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
    });
  } catch (error) {
    console.error("Error creating sandbox:", error.message);
    throw error;
  }
}


