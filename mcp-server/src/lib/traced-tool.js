import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("ai-chat-mcp-server");

/**
 * Higher-order function that wraps an MCP tool execution in an OpenTelemetry active span.
 * Handles attributes, exception recording, span status, and structured error throwing.
 */
export const tracedToolHandler = (spanName, handler) => {
  return async (args) => {
    return tracer.startActiveSpan(spanName, async (span) => {
      try {
        span.setAttribute("mcp.tool.name", spanName.replace("mcp.", ""));

        if (args?.context?.role) {
          span.setAttribute("user.role", args.context.role);
        }

        const result = await handler(args, span);

        span.setStatus({
          code: SpanStatusCode.OK,
        });

        return result;
      } catch (error) {
        span.recordException(error);

        const errorMessage =
          error.response?.data?.message || error.message || "Internal error";

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
        });

        throw new Error(errorMessage);
      } finally {
        span.end();
      }
    });
  };
};
