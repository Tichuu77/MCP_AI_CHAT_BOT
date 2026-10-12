import express from "express";
import cors from "cors";
import helmet from "helmet";
import { apiLimiter } from "./middleware/rateLimit.js";
import apiRouter from "./routes/index.js";
import errorMiddleware from "./middleware/error.middleware.js";

const app = express();

// Security
app.use(
  helmet({
    // 1. Content Security Policy
    // Controls which sources the browser can load resources from.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https:", "'unsafe-inline'"],
        upgradeInsecureRequests: [],
      },
    },

    // 2. Cross-Origin Embedder Policy
    // Restricts certain cross-origin resource embedding.
    crossOriginEmbedderPolicy: true,

    // 3. Cross-Origin Opener Policy
    // Isolates browsing contexts from cross-origin windows.
    crossOriginOpenerPolicy: {
      policy: "same-origin",
    },

    // 4. Cross-Origin Resource Policy
    // Restricts cross-origin loading of resources.
    crossOriginResourcePolicy: {
      policy: "same-origin",
    },

    // 5. Origin-Agent-Cluster
    // Requests origin-level isolation.
    originAgentCluster: true,

    // 6. Referrer Policy
    // Controls referrer information sent by the browser.
    referrerPolicy: {
      policy: "no-referrer",
    },

    // 7. HTTP Strict Transport Security (HSTS)
    // Tells browsers to use HTTPS for the configured duration.
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false,
    },

    // 8. X-Content-Type-Options
    // Prevents certain types of MIME sniffing.
    xContentTypeOptions: true,

    // 9. X-DNS-Prefetch-Control
    // Disables browser DNS prefetching.
    xDnsPrefetchControl: {
      allow: false,
    },


    // 11. X-Frame-Options
    // Prevents your pages from being embedded in frames.
    frameguard: {
      action: "sameorigin",
    },

    // 12. X-Permitted-Cross-Domain-Policies
    // Restricts legacy cross-domain policy files.
    permittedCrossDomainPolicies: {
      permittedPolicies: "none",
    },

    // 13. X-XSS-Protection
    // Disables the deprecated browser XSS filter.
    xXssProtection: false,

    // 14. Removes the X-Powered-By response header.
    xPoweredBy: false,

    // 15. Prevents IE from opening sites in an insecure context.
    ieNoOpen: true,

    // 16. Enables DNS prefetch control and other defaults
    // as configured above.
  })
);

// CORS
app.use(cors());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use("/api", apiLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "ai-chat-mcp-backend" });
});

// API routes
app.use("/api", apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorMiddleware);

export default app;
