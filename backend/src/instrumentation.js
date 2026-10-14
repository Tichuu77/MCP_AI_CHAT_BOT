import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

// Suppress unhandled crash logs if collector is not running locally
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const isOtelEnabled = process.env.ENABLE_OTEL === "true";

if (isOtelEnabled) {
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
  });

  const resource = resourceFromAttributes({
    "service.name": "ai-chat-mcp-backend",
    "service.version": "1.0.0",
    "deployment.environment": process.env.NODE_ENV || "development",
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs instrumentation to prevent watch mode restarts on file access
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
    console.log("OpenTelemetry initialized");
  } catch (err) {
    console.warn("OpenTelemetry failed to start:", err.message);
  }
} else {
  // Graceful no-op when OTLP collector is not active
  console.log("OpenTelemetry inactive (set ENABLE_OTEL=true in .env to enable)");
}