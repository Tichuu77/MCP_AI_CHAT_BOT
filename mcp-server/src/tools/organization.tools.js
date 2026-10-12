import { authContextSchema } from "../schemas/auth.schema.js";
import { tracedToolHandler } from "../lib/traced-tool.js";
import { api } from "../lib/api-client.js";

export const registerOrganizationTools = (server) => {
  server.registerTool(
    "get_organization_summary",
    {
      description:
        "Get the summary of the organization including members and conversations count. Admin only.",
      inputSchema: {
        context: authContextSchema,
      },
    },
    tracedToolHandler("mcp.get_organization_summary", async ({ context }) => {
      const response = await api.get("/api/mcp/organization/summary", {
        headers: { "x-user-context": JSON.stringify(context) },
      });

      const data = response.data;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: data.message,
                data: data.data,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );
};
