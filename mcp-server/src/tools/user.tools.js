import { z } from "zod";
import { tracedToolHandler } from "../lib/traced-tool.js";

export const registerUserTools = (server) => {
  server.registerTool(
    "get_current_user_info",
    {
      description:
        "Get the verified profile information for the authenticated user, including their name, user ID, organization ID, role, and organization name when available. Use this for questions about who the signed-in user is or their account details.",
      inputSchema: z.object({
        context: z.object({
          userId: z.string(),
          organizationId: z.string(),
          role: z.enum(["admin", "manager", "member"]),
          name: z.string().optional(),
          organizationName: z.string().optional(),
        }),
      }),
    },
    tracedToolHandler("mcp.get_current_user_info", async ({ context }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                userId: context.userId,
                organizationId: context.organizationId,
                role: context.role,
                ...(context.name ? { name: context.name } : {}),
                ...(context.organizationName
                  ? { organizationName: context.organizationName }
                  : {}),
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
