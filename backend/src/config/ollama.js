import { Ollama } from "ollama";
import { Agent, fetch as undiciFetch } from "undici";
import dotenv from "dotenv";

dotenv.config();

const dispatcher = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
});


const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || "https://ollama.com",
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
  },
  fetch: (url, init) =>
    undiciFetch(url, {
      ...init,
      dispatcher,
    }),
});

export default ollama;