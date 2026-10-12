import { z } from "zod";
import { authContextSchema } from "../schemas/auth.schema.js";
import { tracedToolHandler } from "../lib/traced-tool.js";
import { api } from "../lib/api-client.js";

export const registerMemberTools = (server) => {
  // ── list_members ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_members",
    {
      description:
        "List members that the authenticated user is allowed to view. Admins can view all organization members. Managers can view their own members. Members cannot use this tool.",
      inputSchema: z.object({
        context: authContextSchema,
      }),
    },
    tracedToolHandler("mcp.list_members", async ({ context }, span) => {
      const response = await api.get("/api/mcp/members", {
        headers: { "x-user-context": JSON.stringify(context) },
      });

      const data = response.data;
      if (span && data.count !== undefined) {
        span.setAttribute("mcp.member_count", data.count);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: data.count,
                message: data.message,
                members: data.data,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // ── create_member ────────────────────────────────────────────────────────
  server.registerTool(
    "create_member",
    {
      description:
        "Create a new member in the organization. Admins can create members under any manager or without a manager. Managers can only create members under themselves. Members cannot use this tool.",
      inputSchema: z.object({
        context: authContextSchema,
        memberData: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          role: z.enum(["manager", "member"]).optional(),
          password: z.string().min(6),
        }),
      }),
    },
    tracedToolHandler("mcp.create_member", async ({ context, memberData }) => {
      const response = await api.post(
        "/api/mcp/members",
        { memberData },
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
                member: data.data,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // ── get_members_by_args ──────────────────────────────────────────────────
  server.registerTool(
    "get_members_by_args",
    {
      description:
        "Get members that match the specified arguments like name, email, and role. Admins can get members under any manager or without a manager. Managers can only get members under themselves. Members cannot use this tool.",
      inputSchema: z.object({
        context: authContextSchema,
        args: z.object({
          name: z.string().min(1).optional(),
          email: z.string().email().optional(),
          role: z.enum(["manager", "member"]).optional(),
        }),
      }),
    },
    tracedToolHandler("mcp.get_members_by_args", async ({ context, args }) => {
      const response = await api.get("/api/mcp/members/get", {
        headers: { "x-user-context": JSON.stringify(context) },
        params: args,
      });

      const data = response.data;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: data.count,
                message: data.message,
                members: data.data,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // ── update_member ────────────────────────────────────────────────────────
  server.registerTool(
    "update_member",
    {
      description:
        "Update a member in the organization. Can update member name and email. Admins can update any member. Managers can only update members under themselves. Members cannot use this tool.",
      inputSchema: z.object({
        context: authContextSchema,
        memberId: z.string(),
        memberData: z.object({
          name: z.string().min(1).optional(),
          email: z.string().email().optional(),
        }),
      }),
    },
    tracedToolHandler(
      "mcp.update_member",
      async ({ context, memberId, memberData }) => {
        const response = await api.put(
          `/api/mcp/members/${memberId}`,
          { memberData },
          {
            headers: {
              "x-user-context": JSON.stringify(context),
            },
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
                  member: data.data,
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

  // ── delete_member ────────────────────────────────────────────────────────
  server.registerTool(
    "delete_member",
    {
      description:
        "Delete a member from the organization. Admins can delete any member. Managers can only delete members under themselves. Members cannot use this tool.",
      inputSchema: z.object({
        context: authContextSchema,
        memberId: z.string(),
      }),
    },
    tracedToolHandler("mcp.delete_member", async ({ context, memberId }) => {
      const response = await api.delete(`/api/mcp/members/${memberId}`, {
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
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // ── get_members_summary ──────────────────────────────────────────────────
  server.registerTool(
    "get_members_summary",
    {
      description:
        "Get the summary of the members of the organization. Accessible by admins and managers.",
      inputSchema: z.object({
        context: authContextSchema,
      }),
    },
    tracedToolHandler("mcp.get_members_summary", async ({ context }) => {
      const response = await api.get("/api/mcp/members/summary", {
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
