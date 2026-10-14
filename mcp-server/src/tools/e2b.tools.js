import { z } from "zod";
import { authContextSchema } from "../schemas/auth.schema.js";
import { tracedToolHandler } from "../lib/traced-tool.js";
import { api } from "../lib/api-client.js";

export const registerSandboxTools = (server) => {
  server.registerTool(
    "run_code",
    {
      description:
        "Execute code, test suites, or backend projects in a secure sandboxed environment with dependencies. Use this tool whenever you need to run, calculate, test, debug, or verify executable code in javascript, python, java, c, cpp, ruby, or go. Do NOT call this tool for browser UI (e.g. React/HTML) or without providing actual code or files.",
      inputSchema: z.object({
        context: authContextSchema,
        code: z
          .string()
          .optional()
          .describe("Single-file code to execute"),
        language: z
          .string()
          .default("javascript")
          .describe("Programming language (e.g. javascript, python, java, c, cpp, ruby, go)"),
        files: z
          .array(
            z.object({
              path: z.string().describe("File path relative to project, e.g. src/index.js"),
              content: z.string().describe("File content"),
              language: z.string().optional(),
            })
          )
          .optional()
          .describe("List of files for a multi-file project"),
        dependencies: z
          .array(z.string())
          .optional()
          .describe("Packages to install before execution, e.g. ['express', 'jest', 'lodash']"),
        commands: z
          .array(z.string())
          .optional()
          .describe("Sequential commands to execute, e.g. ['npx jest --verbose', 'node src/index.js']"),
        keepAlive: z
          .boolean()
          .optional()
          .describe("Set to true to keep the sandbox active across conversation turns"),
      }),
    },
    tracedToolHandler(
      "mcp.run_code",
      async ({ context, code, language, files, dependencies, commands, keepAlive }) => {
        const response = await api.post(
          "/api/mcp/sandbox/run-code",
          { code, language, files, dependencies, commands, keepAlive },
          {
            headers: { "x-user-context": JSON.stringify(context) },
            timeout: 60000, // 60s timeout for installing packages + running tests
          }
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data),
            },
          ],
        };
      }
    )
  );
};