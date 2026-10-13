export const registerResources = (server) => {

  // ── 1. Permission Catalog ──────────────────────────────
  server.registerResource(
    "permission_catalog",
    "permissions://catalog",
    {
      title: "Permission Catalog",
      description:
        "Complete list of all available permissions in the system and what each one controls",
      mimeType: "application/json",
    },
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href || "permissions://catalog",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                permissions: {
                  "member:create":
                    "Create new members in the organization",
                  "member:read":
                    "View member details and list members",
                  "member:update":
                    "Modify existing member information (name, email)",
                  "member:delete":
                    "Remove members from the organization",
                  "organization:read":
                    "View organization details and settings",
                  "conversation:create":
                    "Start new chat conversations",
                  "conversation:read":
                    "View existing chat conversations",
                  "conversation:update":
                    "Modify chat conversations",
                  "conversation:delete":
                    "Delete chat conversations",
                  "summary:read":
                    "View summaries for all members in the organization",
                  "summary:self":
                    "View own summary only",
                  "compare:read":
                    "Compare member performance and activity",
                },
                total: 12,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── 2. Role Hierarchy ──────────────────────────────────
  server.registerResource(
    "role_hierarchy",
    "roles://hierarchy",
    {
      title: "Role Hierarchy",
      description:
        "Organization role structure, hierarchy rules, and what each role can do",
      mimeType: "application/json",
    },
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href || "roles://hierarchy",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                hierarchy: ["admin", "manager", "member"],
                roles: {
                  admin: {
                    level: 1,
                    description:
                      "Full access to all permissions — cannot be overridden",
                    can_manage: ["manager", "member"],
                    default_permissions: "all",
                  },
                  manager: {
                    level: 2,
                    description:
                      "Manages members assigned to them via managerId",
                    can_manage: ["member"],
                    default_permissions: [
                      "member:create",
                      "member:read",
                      "member:update",
                      "member:delete",
                      "organization:read",
                      "conversation:create",
                      "conversation:read",
                      "conversation:update",
                      "conversation:delete",
                      "summary:read",
                      "summary:self",
                    ],
                  },
                  member: {
                    level: 3,
                    description:
                      "Basic access — most restricted role, can only manage own conversations",
                    can_manage: [],
                    default_permissions: [
                      "organization:read",
                      "conversation:create",
                      "conversation:read",
                      "conversation:update",
                      "conversation:delete",
                      "summary:self",
                    ],
                  },
                },
                rules: [
                  "Admins have all permissions and can manage anyone in the organization",
                  "Managers can only manage members assigned to them (via managerId field)",
                  "Members can only manage their own conversations and view their own summary",
                  "Role permissions can be customized per-organization by admins",
                  "User-level overrides (allow/deny) take precedence over role defaults",
                  "Deny overrides always take precedence over allow overrides",
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── 3. API Usage Guidelines ────────────────────────────
  server.registerResource(
    "api_guidelines",
    "docs://api-guidelines",
    {
      title: "API Usage Guidelines",
      description:
        "Best practices and constraints for using the organization management tools",
      mimeType: "text/markdown",
    },
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href || "docs://api-guidelines",
            mimeType: "text/markdown",
            text: `# API Usage Guidelines

## Authentication Context
Every tool call includes an \`authContext\` that is automatically injected by the system from the user's verified session.
You do NOT need to ask the user for their userId, organizationId, or role — these are provided automatically.

## Role-Based Access Control
- **Admin**: Can access all tools and all data across the organization
- **Manager**: Can access member tools, but only for members assigned to them (managerId match)
- **Member**: Can only use get_current_user_info and get_current_user_permissions

## Tool Selection Guide
| Task | Tool to Use |
|------|-------------|
| Who am I? | get_current_user_info |
| My permissions | get_current_user_permissions |
| List team members | list_members |
| Search for someone | get_members_by_args |
| Add a new person | create_member |
| Update someone's info | update_member |
| Remove someone | delete_member |
| Check role defaults | get_organization_role_permissions |
| Change role defaults | update_organization_role_permissions |
| Check user permissions | get_user_permissions |
| Override user permissions | set_user_permissions |
| Organization overview | get_organization_summary |
| Team overview | get_members_summary |

## Best Practices
1. Always check the user's role before attempting restricted operations
2. When creating members, generate a secure password (12+ chars, mixed case, numbers, symbols)
3. When modifying permissions, first show current permissions, then confirm changes with the user
4. Never expose raw MongoDB IDs to users in conversation — use names and emails instead
5. For bulk operations, process one at a time and report progress after each step

## Error Codes
- **400**: Invalid input (missing required fields, bad format)
- **403**: The user lacks permission for this operation
- **404**: The target member was not found or access is denied (manager scope)
- **409**: Email already exists (when creating members)
`,
          },
        ],
      };
    }
  );

  // ── 4. Available Languages for Sandbox Code Execution ───────────────────────────────
  server.registerResource(
    "sandbox_languages",
    "sandbox://languages",
    {
      title: "Sandbox Code Execution Languages",
      description:
        "List of programming languages supported for sandboxed code execution",
      mimeType: "application/json",
    },
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href || "sandbox://languages",
            mimeType: "application/json",
            text: JSON.stringify([
              { name: "JavaScript", value: "javascript" },
              { name: "Python", value: "python" },
              { name: "Ruby", value: "ruby" },
              { name: "Go", value: "go" },
              { name: "Java", value: "java" },
              { name: "C++", value: "cpp" },
            ]),
          }
        ],
      };
    }
  );
};
 
