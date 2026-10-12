import { z } from "zod";
import { authContextSchema } from "../schemas/auth.schema.js";
import { tracedToolHandler } from "../lib/traced-tool.js";
import { api } from "../lib/api-client.js";

export const registerPermissionTools = (server) => {
  // ── get_organization_role_permissions ────────────────────────────────────
  server.registerTool(
    "get_organization_role_permissions",
    {
      description:
        "Get the organization role permissions. Admins can view all permissions.",
      inputSchema: z.object({
        context: authContextSchema,
        role: z.enum(["manager", "member"]),
      }),
    },
    tracedToolHandler(
      "mcp.get_organization_role_permissions",
      async ({ context, role }) => {
        const response = await api.get(
          `/api/mcp/permissions/organization/${role}`,
          {
            headers: { "x-user-context": JSON.stringify(context) },
          }
        );

        const data = response.data;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: data.message,
                  permissions: data.data,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    )
  );

  // ── update_organization_role_permissions ──────────────────────────────────
  server.registerTool(
    "update_organization_role_permissions",
    {
      description:
        "Update the organization role permissions. Admins can update all permissions.",
      inputSchema: z.object({
        context: authContextSchema,
        permissions: z.array(z.string()),
        role: z.enum(["manager", "member"]),
      }),
    },
    tracedToolHandler(
      "mcp.update_organization_role_permissions",
      async ({ context, permissions, role }) => {
        const response = await api.put(
          `/api/mcp/permissions/organization/${role}`,
          { permissions },
          {
            headers: { "x-user-context": JSON.stringify(context) },
          }
        );

        const data = response.data;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: data.message,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    )
  );

  // ── get_user_permissions ──────────────────────────────────────────────────
  server.registerTool(
    "get_user_permissions",
    {
      description:
        "Get the effective permissions for the given user, including role permissions, allowed permissions, and denied permissions. Accessible by admin and manager.",
      inputSchema: z.object({
        context: authContextSchema,
        userId: z.string(),
      }),
    },
    tracedToolHandler(
      "mcp.get_user_permissions",
      async ({ context, userId }) => {
        const response = await api.get(
          `/api/mcp/permissions/organization/members/${userId}`,
          {
            headers: { "x-user-context": JSON.stringify(context) },
          }
        );

        const data = response.data;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: data.message,
                  data: data.data,
                  catalog: data.catalog,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    )
  );

  // ── set_user_permissions ──────────────────────────────────────────────────
  server.registerTool(
    "set_user_permissions",
    {
      description:
        "Set the effective permissions for the given user. Accessible by admin and manager.",
      inputSchema: z.object({
        context: authContextSchema,
        userId: z.string(),
        allow: z.array(z.string()),
        deny: z.array(z.string()),
      }),
    },
    tracedToolHandler(
      "mcp.set_user_permissions",
      async ({ context, userId, allow, deny }) => {
        const response = await api.put(
          `/api/mcp/permissions/organization/members/${userId}`,
          { allow, deny },
          {
            headers: { "x-user-context": JSON.stringify(context) },
          }
        );

        const data = response.data;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: data.message,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    )
  );

  // ── get_current_user_permissions ──────────────────────────────────────────
  server.registerTool(
    "get_current_user_permissions",
    {
      description:
        "Get the effective permissions for the current user, including role permissions, allowed permissions, and denied permissions.",
      inputSchema: z.object({
        context: authContextSchema,
      }),
    },
    tracedToolHandler(
      "mcp.get_current_user_permissions",
      async ({ context }) => {
        const response = await api.get(`/api/mcp/permissions/me`, {
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
                  catalog: data.catalog,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    )
  );
};
