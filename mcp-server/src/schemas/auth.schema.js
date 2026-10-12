import { z } from "zod";

export const authContextSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  role: z.enum(["admin", "manager", "member"]),
  name: z.string().optional(),
  organizationName: z.string().optional(),
});
