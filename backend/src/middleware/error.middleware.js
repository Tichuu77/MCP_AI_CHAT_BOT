export default function errorMiddleware(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  if (!isTest) {
    console.error({
      url: req.originalUrl,
      method: req.method,
      message: err.message,
      ...(err.stack && { stack: err.stack }),
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate field value",
      field: err.keyValue ? Object.keys(err.keyValue) : [],
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired" });
  }

  // Default error response
  return res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(err.errors && { errors: err.errors }),
    ...(isProd || !err.stack ? {} : { stack: err.stack }),
  });
}
