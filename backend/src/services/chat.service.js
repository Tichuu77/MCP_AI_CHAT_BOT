import ollama from "../config/ollama.js";

import {
  listMCPTools,
  callMCPTool,
} from "ai-chat-mcp-client";

import {
  trace,
  SpanStatusCode,
} from "@opentelemetry/api";

const MODEL =
  process.env.OLLAMA_MODEL || "gpt-oss:20b-cloud";

const tracer = trace.getTracer("ai-chat-mcp");

const extractToolResult = (result) => {
  if (!result?.content) {
    return "";
  }

  return result.content
    .map((item) => {
      if (typeof item === "string") return item;
      return item.text || JSON.stringify(item);
    })
    .join("\n");
};

const asksForUserInfo = (messages) => {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;

  if (typeof latestUserMessage !== "string") {
    return false;
  }

  const userInfoQuestion =
    /\b(?:who am i|what(?:'s| is) my|tell me my|show me my|my (?:name|profile|account|user id|role|organization|company|email|details|information)|what (?:do you know about me|information (?:do you have|you have)|details do you have))\b/i;

  return userInfoQuestion.test(latestUserMessage);
};

export const generateAIResponse = async (
  messages,
  authContext
) => {
  return tracer.startActiveSpan(
    "generateAIResponse",
    async (span) => {

      try {
        // Get MCP tools
        const mcpTools = await tracer.startActiveSpan(
          "mcp.listTools",
          async (span) => {
            try {
              const tools = await listMCPTools();

              span.setAttribute(
                "mcp.tool_count",
                tools.length
              );

              span.setStatus({
                code: SpanStatusCode.OK,
              });

              return tools;
            } catch (error) {
              span.recordException(error);

              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });

              throw error;
            } finally {
              span.end();
            }
          }
        );

        // Authentication context is injected by the MCP client, not supplied by the AI.
        const ollamaTools = mcpTools.map((tool) => {
          const inputSchema = tool.inputSchema || {};
          const properties = {
            ...(inputSchema.properties || {}),
          };
          delete properties.context;

          const required = inputSchema.required?.filter(
            (property) => property !== "context"
          );

          return {
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: {
                type: "object",
                ...inputSchema,
                properties,
                ...(required?.length ? { required } : {}),
              },
            },
          };
        });

        // Normalize messages: preserve system instructions without duplication, and apply sliding window
        const systemMessages = messages.filter((m) => m.role === "system");
        const nonSystemMessages = messages.filter((m) => m.role !== "system");

        const activeSystemMessages =
          systemMessages.length > 0
            ? systemMessages
            : [
                {
                  role: "system",
                  content:
                    "You are a helpful assistant. Do not expose model or internal details.",
                },
              ];

        // Sliding window: keep the most recent 20 messages to prevent token context exhaustion
        const MAX_CONTEXT_MESSAGES = 20;
        const recentMessages = nonSystemMessages.slice(-MAX_CONTEXT_MESSAGES);

        const conversationMessages = [
          ...activeSystemMessages,
          ...recentMessages,
        ];

        //   if (asksForUserInfo(messages)) {
        //     const result = await callMCPTool(
        //       "get_current_user_info",
        //       {},
        //       authContext
        //     );
        //     const userInfo = extractToolResult(result);

        //     if (!userInfo) {
        //       throw new Error("get_current_user_info returned no user information.");
        //     }

        //     conversationMessages.splice(1, 0, {
        //       role: "system",
        //       content:
        //         "The following information was returned by the get_current_user_info MCP tool " +
        //         "for the authenticated user. Use it to answer the user's profile question:\n" +
        //         userInfo,
        //     });
        //   }

        // Track last code execution result from sandbox if run_code was called
        let lastExecutionResult = null;

        // Allow multiple tool-call rounds (up to 8 to accommodate setup + install + run + verify)
        for (let round = 0; round < 8; round++) {
          console.log(`AI round: ${round + 1}`);

          const response = await tracer.startActiveSpan(
            "ollama.chat",
            async (span) => {
              const startTime = Date.now();

              try {
                span.setAttribute("ai.model", MODEL);
                span.setAttribute("ai.round", round + 1);

                let response;
                for (let attempt = 1; attempt <= 3; attempt++) {
                  try {
                    response = await ollama.chat({
                      model: MODEL,
                      messages: conversationMessages,
                      tools: ollamaTools,
                      stream: false,
                    });
                    break;
                  } catch (chatErr) {
                    const isTransient =
                      chatErr.message?.includes("Internal Server Error") ||
                      chatErr.status === 500 ||
                      chatErr.status === 503;
                    if (isTransient && attempt < 3) {
                      const backoffMs = attempt * 1500;
                      console.warn(
                        `Transient Ollama error on attempt ${attempt} (${chatErr.message}). Retrying in ${backoffMs}ms...`
                      );
                      await new Promise((resolve) => setTimeout(resolve, backoffMs));
                    } else {
                      throw chatErr;
                    }
                  }
                }

                span.setStatus({
                  code: SpanStatusCode.OK,
                });

                return response;
              } catch (error) {
                span.recordException(error);

                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: error.message,
                });

                throw error;
              } finally {
                span.end();
              }
            }
          );

          const assistantMessage = response.message;

          // Add AI response to conversation
          conversationMessages.push(assistantMessage);

          // No tool call → final answer
          if (!assistantMessage.tool_calls?.length) {
            return {
              content: assistantMessage.content,
              lastExecution: lastExecutionResult,
              toString() {
                return this.content;
              },
            };
          }

          // Execute requested MCP tools
          for (const toolCall of assistantMessage.tool_calls) {
            const toolName =
              toolCall.function.name;

            let toolArguments =
              toolCall.function.arguments || {};

            if (typeof toolArguments === "string") {
              try {
                toolArguments = JSON.parse(toolArguments);
              } catch (parseErr) {
                console.error("Failed to parse tool arguments:", toolArguments);
              }
            }

            console.log(
              "AI requested MCP tool:",
              toolName
            );

            console.log(
              "Tool arguments:",
              toolArguments
            );

            let toolResult;

            try {
              const result = await tracer.startActiveSpan(
                "mcp.callTool",
                async (span) => {
                  try {
                    span.setAttribute(
                      "mcp.tool.name",
                      toolName
                    );

                    const result = await callMCPTool(
                      toolName,
                      toolArguments,
                      authContext
                    );

                    span.setStatus({
                      code: SpanStatusCode.OK,
                    });

                    return result;
                  } catch (error) {
                    span.recordException(error);

                    span.setStatus({
                      code: SpanStatusCode.ERROR,
                      message: error.message,
                    });

                    throw error;
                  } finally {
                    span.end();
                  }
                }
              );

              toolResult =
                extractToolResult(result);
            } catch (toolError) {
              console.error(
                `MCP tool call error (${toolName}):`,
                toolError.message
              );
              toolResult = JSON.stringify({
                success: false,
                error: `Tool execution failed: ${toolError.message}`,
              });
            }

            console.log(
              "MCP result:",
              toolResult
            );

            // If run_code was invoked, capture execution details
            if (toolName === "run_code") {
              try {
                const parsed =
                  typeof toolResult === "string"
                    ? JSON.parse(toolResult)
                    : toolResult;
                const execData = parsed?.data || parsed;
                if (execData && typeof execData.success === "boolean") {
                  lastExecutionResult = {
                    success: execData.success,
                    stdout: execData.stdout || "",
                    stderr: execData.stderr || "",
                    exitCode: execData.exitCode ?? (execData.success ? 0 : 1),
                    ranAt: new Date(),
                  };
                }
              } catch {
                // Ignore parse errors
              }
            }

            conversationMessages.push({
              role: "tool",
              tool_name: toolName,
              content: toolResult || "No output returned from tool.",
            });
          }
        }

        throw new Error(
          "AI tool-calling limit exceeded"
        );
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });

        throw error;
      }
      finally {
        span.end();
      }
    }
  );
};

export const testMCPConnection = async (authContext) => {
  const result =
    await callMCPTool("test", {}, authContext);

  return result;
};