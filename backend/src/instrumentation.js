import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";

const traceExporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});

const resource = resourceFromAttributes({
  "service.name": "ai-chat-mcp-backend",
  "service.version": "1.0.0",
  "deployment.environment": "development",
});

const sdk = new NodeSDK({
  resource,

  traceExporter,

  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
});

sdk.start();

console.log("OpenTelemetry initialized");