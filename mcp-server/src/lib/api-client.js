import Axios from "axios";

export const api = Axios.create({
  baseURL: process.env.BACKEND_URL || "http://localhost:5000",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (process.env.BACKEND_URL) {
    config.baseURL = process.env.BACKEND_URL;
  }
  config.headers["x-internal-secret"] = process.env.MCP_INTERNAL_SECRET || "";
  return config;
});

