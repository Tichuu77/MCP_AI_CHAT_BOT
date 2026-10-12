import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const serverPath = path.resolve(
  __dirname,
  "../../mcp-server/src/index.js"
);

let client = null;
let connected = false;
let connectingPromise = null;

// --------------------------------------------------
// CONNECT
// --------------------------------------------------

export const connectMCP = async () => {
  if (connected) {
    return client;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    client = new Client({
      name: "ai-chat-mcp-client",
      version: "1.0.0",
    });

    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: {
        ...process.env,
        BACKEND_URL: process.env.BACKEND_URL || "http://localhost:5000",
        MCP_INTERNAL_SECRET: process.env.MCP_INTERNAL_SECRET || "",
      },
    });

    await client.connect(transport);

    connected = true;
    connectingPromise = null;

    console.log("MCP client connected");

    return client;
  })();

  return connectingPromise;
};

// --------------------------------------------------
// LIST TOOLS
// --------------------------------------------------

export const listMCPTools = async () => {
  const mcpClient = await connectMCP();

  const result = await mcpClient.listTools();

  return result.tools;
};

// --------------------------------------------------
// CALL TOOL
// --------------------------------------------------

export const callMCPTool = async (
  name,
  args,
  authContext
) => {
  const mcpClient = await connectMCP();

  // AI/user arguments + trusted backend context
  const safeArguments = {
    ...args,

    // IMPORTANT:
    // AI cannot control these values.
    context: {
      userId: authContext.userId,
      organizationId: authContext.organizationId,
      role: authContext.role,
      name: authContext.name,
      organizationName: authContext.organizationName,
    },
  };

  const result = await mcpClient.callTool({
    name,
    arguments: safeArguments,
  });

  return result;
};

// --------------------------------------------------
// CLOSE
// --------------------------------------------------

export const closeMCP = async () => {
  if (!client) {
    return;
  }

  await client.close();

  client = null;
  connected = false;
};