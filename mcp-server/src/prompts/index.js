import { z } from "zod";

export const registerPrompts = (server) => {

  // ── 1. Onboard New Member ──────────────────────────────
  server.registerPrompt(
    "onboard_member",
    {
      title: "Onboard New Member",
      description:
        "Walk through creating a new organization member with proper role and permissions setup",
      argsSchema: z.object({
        name: z.string().describe("New member's full name"),
        email: z.string().email().describe("New member's email"),
        role: z
          .enum(["manager", "member"])
          .default("member")
          .describe("Role to assign"),
      }),
    },
    async ({ name, email, role }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please onboard a new team member with the following details:
- Name: ${name}
- Email: ${email}
- Role: ${role}

Steps to follow:
1. First, create the member account using the create_member tool with a secure temporary password (12+ chars, mixed case, numbers, and symbols).
2. Then, check what permissions their role currently has using get_organization_role_permissions.
3. If they need any special permissions beyond the defaults, set them using set_user_permissions.
4. Finally, confirm the setup by getting their effective permissions using get_user_permissions.

Present a clear summary of the new account including the temporary password they should change on first login.`,
            },
          },
        ],
      };
    }
  );

  // ── 2. Organization Audit ──────────────────────────────
  server.registerPrompt(
    "organization_audit",
    {
      title: "Organization Audit",
      description:
        "Perform a complete audit of the organization — members, roles, and permission configuration",
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please perform a complete organization audit:

1. Get the organization summary using get_organization_summary.
2. List all members using list_members.
3. Check the role permissions for both "manager" and "member" roles using get_organization_role_permissions.
4. Identify any anomalies:
   - Members without proper role assignments
   - Unusual permission configurations
   - Role distribution balance (too many managers, too few, etc.)
   - Any members who might need elevated or reduced permissions

Provide a structured report with findings and actionable recommendations.`,
            },
          },
        ],
      };
    }
  );

  // ── 3. Permission Review for a User ────────────────────
  server.registerPrompt(
    "review_user_permissions",
    {
      title: "Review User Permissions",
      description:
        "Review and explain a specific user's effective permissions compared to their role defaults",
      argsSchema: z.object({
        userId: z.string().describe("The user ID to review"),
      }),
    },
    async ({ userId }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Review the permissions for user ID: ${userId}

1. Get the user's effective permissions using get_user_permissions.
2. Get their role's default permissions using get_organization_role_permissions.
3. Compare the two and identify:
   - Which permissions come from their role baseline
   - Which are explicitly allowed overrides
   - Which are explicitly denied overrides
4. Explain each permission in plain, non-technical language.
5. Flag any security concerns (e.g., a basic member with delete rights, or a manager missing expected permissions).`,
            },
          },
        ],
      };
    }
  );

  // ── 4. Team Member Search ──────────────────────────────
  server.registerPrompt(
    "find_member",
    {
      title: "Find Member",
      description:
        "Search for a team member by various criteria and show their details",
      argsSchema: z.object({
        query: z
          .string()
          .describe("Search query — name, email, or role"),
      }),
    },
    async ({ query }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Find team members matching: "${query}"

Use get_members_by_args to search. Try matching by:
- Name (if it looks like a person's name)
- Email (if it contains @)
- Role (if it's "manager" or "member")

For each result, present their details clearly: name, email, role, and ID.`,
            },
          },
        ],
      };
    }
  );

  // ── 5. My Account Summary ──────────────────────────────
  server.registerPrompt(
    "my_account",
    {
      title: "My Account Summary",
      description:
        "Get a complete summary of the current user's account, role, and permissions",
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Show me everything about my account:

1. Get my profile using get_current_user_info.
2. Get my permissions using get_current_user_permissions.
3. Present a clear summary:
   - My name, role, and organization
   - What I can do (allowed permissions explained in plain language)
   - What I cannot do (denied or missing permissions)
   - Any custom overrides on my account`,
            },
          },
        ],
      };
    }
  );

  // ── 6. Run Code in Sandbox ──────────────────────────────
  server.registerPrompt(
    "run_code",
    {
      title: "Run Code in Sandbox",
      description:
        "Run code in a sandboxed environment. Every member can use this tool. Provide the source code and its programming language.",
      argsSchema: z.object({
        code: z.string().min(1).describe("The source code to execute"),
        language: z.enum(["javascript", "python", "java", "c", "cpp", "ruby", "go"]).describe("The programming language of the code"),
      }),
    },
    async ({ code, language }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Run the following code in a sandboxed environment:

              ${code}

              Language: ${language}`,
            },
          },
        ],
      };
    }
  );
};
