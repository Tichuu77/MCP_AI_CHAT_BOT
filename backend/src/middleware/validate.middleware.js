export default function validate(schema) {
  return (req, _res, next) => {
    try {
      // ── Pattern 1: Flat schema ─────────────────────────────
      if (typeof schema?.safeParse === "function") {
        const result = schema.safeParse(req.body);

        if (!result.success) {
          const errors = result.error?.issues?.map((e) => ({
            field: e.path.join(".") || "root",
            message: e.message,
          })) || [{ field: "root", message: "Validation error" }];

          return next({
            statusCode: 400,
            message: errors[0]?.message || "Validation Error",
            errors,
          });
        }

        req.body = result.data;
        return next();
      }

      // ── Pattern 2: Nested schema ───────────────────────────
      const parts = ["body", "query", "params"];

      for (const part of parts) {
        if (!schema[part]) continue;

        const partSchema = schema[part];

        // ── Zod ─────────────────────────────
        if (typeof partSchema.safeParse === "function") {
          const result = partSchema.safeParse(req[part]);

          if (!result.success) {
            const errors = result.error?.issues?.map((e) => ({
              field: e.path.join(".") || part,
              message: e.message,
            })) || [{ field: part, message: `${part} validation error` }];

            return next({
              statusCode: 400,
              message: errors[0]?.message || `${capitalize(part)} Validation Error`,
              errors,
            });
          }

          Object.defineProperty(req, part, {
            value: result.data,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
