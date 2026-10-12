import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { registerAllTools } from "./tools/index.js";
import { registerPrompts } from "./prompts/index.js";
import { registerResources } from "./resources/index.js";

const server = new McpServer({
  name: "ai-chat-mcp-server",
  version: "1.0.0",
});

// Register capabilities
registerAllTools(server);
registerPrompts(server);
registerResources(server);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("AI Chat MCP Server started");