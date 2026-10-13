import { z } from "zod";
import { authContextSchema } from "../schemas/auth.schema.js";
import { tracedToolHandler } from "../lib/traced-tool.js";
import { api } from "../lib/api-client.js";

export const registerSandboxTools = (server) => {
    server.registerTool(
        "run_code",
        {
            description:
                "Execute code in a secure sandboxed environment. Use this tool whenever you need to run, calculate, test, debug, or verify code in javascript, python, java, c, cpp, ruby, or go. Returns execution status, stdout, stderr, and exitCode.",
            inputSchema: z.object({
                context: authContextSchema,
                code: z.string().min(1).describe("The complete source code to execute"),
                language: z
                    .string()
                    .min(1)
                    .describe("Programming language (e.g. javascript, python, java, c, cpp, ruby, go)"),
            }),
        },
        tracedToolHandler("mcp.run_code", async ({ context, code, language }) => {
            const response = await api.post(
                "/api/mcp/sandbox/run-code",
                { code, language },
                {
                    headers: { "x-user-context": JSON.stringify(context) },
                    timeout: 30000,
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
        })
    );
};
